## Step 2: Convert The Image 🔄

### Create another Azure Function
Yep... We need yet *another* Azure Function. (What can I say? They're pretty helpful.) This one will trigger when **the image blob is stored**, convert it into a PDF, and store it in to the "pdfs" container.

⚠😵**WARNING**😵⚠ Lots of code ahead, but it's all good! I split it into sections.

**First off, the *Online-Convert* API!**
* We're going to need to get another secret key, except this time from the API. Here's [how to do that](https://apiv2.online-convert.com/docs/getting_started/api_key.html).
* Once again, save it in your environment variables so it's accessible.
* *Note: This API does have restrictions on the amount of conversions during 24 hours, so just be wary that you may turn an error after reaching the limit*

⬇This `convertImage()` function does exactly what it's called: convert the image by calling the API. Here's the [documentation](https://apiv2.online-convert.com/docs/input_types/cloud/azure_blob_storage.html)

```js
async function convertImage(blobName){
    const api_key = process.env['convertAPI_KEY'];
    const accountKey = process.env['accountKey'];
    const uriBase = "https://api2.online-convert.com/jobs";
	// env variables (similar to .gitignore/.env file) to not expose personal info

    img = {
    "conversion": [{
        "target": "pdf"
    }],
    "input": [{
        "type": "cloud",
        "source": "azure",
        "parameters": {
            "container": "images",
            "file": blobName
        },
        "credentials": {
            "accountname": "bunnimagestorage",
            "accountkey": accountKey
        }
    }]
    }

    payload = JSON.stringify(img);

    // making the post request
    let resp = await fetch(uriBase, {
        method: 'POST',
        body: payload,
        // we want to send the image
        headers: {
            'x-oc-api-key' : api_key,
            'Content-type' : 'application/json',
            'Cache-Control' : 'no-cache'
        }
    })

    // receive the response
    let data = await resp.json();

    return data;
}
```

⬇To [check the status of the conversion](https://apiv2.online-convert.com/docs/getting_started/job_polling.html) to determine whether we can store the PDF to blob storage yet, let's use this `checkStatus()` function that makes a request to the same `https://api2.online-convert.com/jobs` endpoint, except with a GET request instead of POST.

```js
async function checkStatus(jobId){
    const api_key = process.env['convertAPI_KEY'];
    const uriBase = "https://api2.online-convert.com/jobs";
	// env variables (similar to .gitignore/.env file) to not expose personal info

    // making the post request
    let resp = await fetch(uriBase + "/" + jobId, {
        /*The await expression causes async function execution to pause until a Promise is settled 
        (that is, fulfilled or rejected), and to resume execution of the async function after fulfillment. 
        When resumed, the value of the await expression is that of the fulfilled Promise*/
        method: 'GET',
        headers: {
            'x-oc-api-key' : api_key,
        }
    })

    // receive the response
    let data = await resp.json();

    return data;
}
```
⬇Now, **this function should be familiar...** it's the same exact block of code we used to store our image earlier in the tutorial. *Phew, that already seems like so long ago right?*

```js
async function uploadBlob(pdf, filename){
    // create blobserviceclient object that is used to create container client
    const blobServiceClient = await BlobServiceClient.fromConnectionString(connectionstring);
    // get reference to a container
    const container = "pdfs";
    const containerClient = await blobServiceClient.getContainerClient(container);
    // create blob name
    const blobName = filename;
    // get block blob client
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    const uploadBlobResponse = await blockBlobClient.upload(pdf, pdf.length);
    console.log(`Upload block blob ${blobName} successfully`, uploadBlobResponse.requestId);
    result = {
        body : {
            name : blobName, 
            type: pdf.type,
            data: pdf.length,
            success: true
        }
    };
    return result;
}
```
⬇This is the main section of our code: it gets the blobName, calls the functions, and downloads the PDF to be stored. 
* The Blob Name is retrieved from the eventgrid subscription subject
* Because the API does not convert the image immediately, we need a while loop to repeatedly check for the status of the conversion. 
* The last portion is simply used to [download the converted PDF](https://apiv2.online-convert.com/docs/getting_started/job_downloading.html) with a GET request to the URI you get from the completed file conversion response. (More clarification on that below)

```js
var multipart = require("parse-multipart");
var fetch = require("node-fetch");
const { BlobServiceClient } = require("@azure/storage-blob");
const connectionstring = process.env["AZURE_STORAGE_CONNECTION_STRING"];
const account = "bunnimagestorage";

module.exports = async function (context, eventGridEvent, inputBlob) {
    context.log("<----------------START----------------------->")
    
    const blobUrl = context.bindingData.data.url;
    const blobName = blobUrl.slice(blobUrl.lastIndexOf("/")+1);
    // get blob url and name
    context.log(`Blob Url: ${blobUrl}`);
    context.log(`Image that was uploaded: ${blobName}`);
    
    var result = await convertImage(blobName);
    jobId = result.id

    status = false;
    try {
        while (!status) {
            update = await checkStatus(jobId);
            context.log("<------Trying-------->")
            context.log(update);
            if (update.status.code == "completed") {
                context.log("[!] Image done converting")
                status = true
                uri = update.output[0].uri;
                filename = update.output[0].filename;
                context.log("Download URL: " + uri);
                context.log("Donwnload file: " + filename);
            } else if (update.status.info == "The file has not been converted due to errors."){
                context.log("[!!!] AccountKey is incorrect")
                context.done();
            }
        }
    }
    catch (e) {
        context.log("[!!!] Daily Conversions Reached");
        context.done();
    }

    let resp = await fetch(uri, {
        method: 'GET',
    })

    let data = await resp.buffer();
    context.log(data);
    // let newfile = await uploadBlob(data, filename);
    const uploadStatus = await uploadBlob(data, filename);
    context.log("[!] Uploading to pdfs container...")
    context.log(uploadStatus);
    context.log("<----------------END---------------------->")
    context.done();
};
```
Now that the long block of code is done with, let's take a look at some responses you should expect from the API.

**This is what you would get if the file is still converting: 🤔**
```json
{
   "id":"d86a1ef2-0bae-4c44-b7fc-b8064adfaf29",
   "token":"[YOUR TOKEN]",
   "type":"job",
   "status":{
      "code":"downloading",
      "info":"The file is currently downloading from the source URL."
   },
   "errors":[
      
   ],
   "warnings":[
      
   ],
   "process":true,
   "fail_on_input_error":true,
   "fail_on_conversion_error":true,
   "conversion":[
      {
         "id":"7496fdd6-98ad-4746-841e-6e786bf5ab4a",
         "target":"pdf",
         "category":"document",
         "options":[
            "Object"
         ],
         "metadata":{
            
         },
         "output_target":[
            
         ]
      }
   ],
   "input":[
      {
         "id":"9a60b3a7-1a16-4e4a-adc8-8f7a1105cd4b",
         "type":"cloud",
         "status":"downloading",
         "source":"azure",
         "engine":"auto",
         "options":[
            
         ],
         "filename":"",
         "size":0,
         "hash":"",
         "checksum":"",
         "content_type":"",
         "created_at":"2020-11-15T16:37:24",
         "modified_at":"2020-11-15T16:37:24",
         "credentials":[
            
         ],
         "parameters":[
            "Object"
         ],
         "metadata":{
            
         }
      }
   ],
   "output":[
      
   ],
   "callback":"",
   "notify_status":false,
   "server":"https://www48.online-convert.com/dl/web7",
   "spent":0,
   "created_at":"2020-11-15T16:37:24",
   "modified_at":"2020-11-15T16:37:24"
}
```
<br />

**Here's what you would get when the conversion is complete! (yay) 🥳**
```json
{
   "id":"d86a1ef2-0bae-4c44-b7fc-b8064adfaf29",
   "token":"[YOUR TOKEN]",
   "type":"job",
   "status":{
      "code":"completed",
      "info":"The file has been successfully converted."
   },
   "errors":[
      
   ],
   "warnings":[
      
   ],
   "process":true,
   "fail_on_input_error":true,
   "fail_on_conversion_error":true,
   "conversion":[
      {
         "id":"7496fdd6-98ad-4746-841e-6e786bf5ab4a",
         "target":"pdf",
         "category":"document",
         "options":[
            "Object"
         ],
         "metadata":{
            
         },
         "output_target":[
            
         ]
      }
   ],
   "input":[
      {
         "id":"9a60b3a7-1a16-4e4a-adc8-8f7a1105cd4b",
         "type":"cloud",
         "status":"ready",
         "source":"azure",
         "engine":"auto",
         "options":[
            
         ],
         "filename":"bunnyshopper.jpg",
         "size":77948,
         "hash":"516b00b636181dce5d1f36054d1d6cbf",
         "checksum":"516b00b636181dce5d1f36054d1d6cbf",
         "content_type":"image/jpeg",
         "created_at":"2020-11-15T16:37:24",
         "modified_at":"2020-11-15T16:37:25",
         "credentials":[
            
         ],
         "parameters":[
            "Object"
         ],
         "metadata":[
            "Object"
         ]
      }
   ],
   "output":[
      {
         "id":"e40523c3-9c97-4411-ae45-201e390214a6",
         "source":[
            "Object"
         ],
         "filename":"bunnyshopper.pdf",
         "uri":"https://www48.online-convert.com/dl/web7/download-file/e40523c3-9c97-4411-ae45-201e390214a6/bunnyshopper.pdf",
         "size":86384,
         "status":"enabled",
         "content_type":"application/pdf",
         "downloads_counter":0,
         "checksum":"a5ef2da0c3ccc0753737b13b029fa65e",
         "created_at":"2020-11-15T16:37:28"
      }
   ],
   "callback":"",
   "notify_status":false,
   "server":"https://www48.online-convert.com/dl/web7",
   "spent":1,
   "created_at":"2020-11-15T16:37:24",
   "modified_at":"2020-11-15T16:37:28"
}
```

**Now, just to clarify, please take note of these important pieces of information provided by the outputs:**
1. `update.status.code` --> This tells us whether its done processing or not
2. `update.output[0].uri` --> This gives us the URL we can download the PDF at (used in the last GET request)
3. `result.id` --> Gives the ID of the file conversion "job" so we can continually check for its status

**Before we can test our code, we need one last step: The Trigger!**

<br />

### Creating an Event Subscription
When the image blob is stored in the "images" container, we want the conversion from jpg/jpeg/png to pdf to begin *immediately*! 
> Just like when you "subscribe" to a YouTube channel it gives you notifications, we're going to subscribe to our own Blob Storage and trigger the Azure Function.

**1. Search "Event Grid Subscriptions" in the search bar**

**2. Click "+ Event Subscription" in the top left**

**3. Actually creating it:**

![image](https://user-images.githubusercontent.com/69332964/99189683-5c934180-2730-11eb-8451-17762bf46866.png)
* If it asks you for a name, feel free to put anything you want (make it make sense though...)
* Topic Types = Storage Accounts
* Resource Group = [Insert your Resource Group that holds your storage account]
* Resource = [Insert your storage account name]

*Note: If your storage account doesn't appear, you forgot to follow the "upgrade to v2 storage" step*
* Event Types: **Only select Blob Created**

![image](https://user-images.githubusercontent.com/69332964/99189740-aed46280-2730-11eb-8ff0-c8a7ba19aadc.png)
* Endpoint Type: Azure Function

![image](https://user-images.githubusercontent.com/69332964/99189763-d0354e80-2730-11eb-91e4-5b17fc5e63bd.png)
* Function = [The one we just created to convert the image.. NOT the one that uploads the image blob]

**4. Tweaking some settings...**

* Navigate to the "Filters" tab and "Enable Subject Filtering"
![image](https://user-images.githubusercontent.com/69332964/99189929-bd6f4980-2731-11eb-9b01-b0cef972b96a.png)
* Change the "Subject Begins With" to `/blobServices/default/containers/images/blobs/`
  * This way, the subscription will **not** trigger when a PDF is stored in the "pdfs" container. It will **only** trigger when something is stored in "images."

> Congratulations! You have now subscribed to the "blob created" event in your "images" container that triggers the convert image function!

### Upload a converted PDF to the "pdfs" container!
Now that we've connected our Functions and frontend together with an Event Grid Subscription, try submitting another image to check if it successfully uploads as a PDF into the "pdfs" container.

> If you used my code and have the same context.log()'s, you should get something like this when the PDF uploads:
![image](https://user-images.githubusercontent.com/69332964/99191696-50ad7c80-273c-11eb-947e-5e9a9962ddb0.png)

