## Step 2: Convert The Image 🔄

### Create another Azure Function
Yep... We need yet *another* Azure Function. (What can I say? They're pretty helpful.) This one will trigger when **the image blob is stored**, then convert it into a PDF, and store it in the "pdfs" container.

However, this time, it will be an **Event Grid Trigger**, so make sure you select the right one! 

![Select the Event Grid Trigger](https://user-images.githubusercontent.com/69332964/99191739-a4b86100-273c-11eb-8015-9988540fc67c.png)

> What's the difference?
> * Event Grid Triggers trigger based on an **Event Grid Subscription,** which we will create later in this step.
> 	* Our trigger will fire when a blob is stored in the "images" container
> * HTTP Triggers fire when a GET or POST request is made to the endpoint (function URL)

<br />

**Commercial Break** 📺
Let's recap:
* **Step 1 ✅:** We created the "Upload" page and an HTTP Trigger Function that uploaded the user's image to a storage container.
* **Step 2:** We will create an **Event Grid** function that converts the image into a PDF by calling the *Online Convert API* and will upload the PDF to blob storage.

<br />

⚠😵**WARNING**😵⚠ Lots of code ahead, but it's all good! I split it into sections.

**First off, the *Online-Convert* API!**
* We're going to need to get another secret key, except this time from the API. Here's [how to get that](https://apiv2.online-convert.com/docs/getting_started/api_key.html).
* Once again, save it in your environment variables so it's accessible.
* **Note**: This API does have restrictions on the amount of conversions during 24 hours, so just be aware that you may get an error after reaching the limit.

⬇ This `convertImage()` function does exactly what it's called: convert the image by calling the Online-Convert API. Here's some [documentation](https://apiv2.online-convert.com/docs/input_types/cloud/azure_blob_storage.html) around how to use the API with Azure Blob Storage.

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

⬇To [check the status of the conversion](https://apiv2.online-convert.com/docs/getting_started/job_polling.html) and determine whether we can store the PDF to blob storage yet, let's use this `checkStatus()` function that makes a request to the same `https://api2.online-convert.com/jobs` endpoint, except with a GET request instead of POST.

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
* The `blobName` is retrieved from the `EventGrid` subscription subject* in lines... [!!!!!]
* Because the API does not convert the image immediately, we need a while loop to repeatedly check for the status of the conversion. 
* The last portion is used to [download the converted PDF](https://apiv2.online-convert.com/docs/getting_started/job_downloading.html) by sending a GET request to the URI from the completed file conversion response.

> *What's a subject?
> * This part of the [Event response](https://docs.microsoft.com/en-us/azure/event-grid/event-schema-blob-storage#microsoftstorageblobcreated-event) contains information about what specific file caused the Azure Function to fire.
> * Example: `/blobServices/default/containers/test-container/blobs/new-file.txt` where the file is `new-file.txt`


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

**Now that the long block of code is done with, let's take a look at some responses you should expect from the API.**

* [This is](https://gist.github.com/emsesc/01e30ba32a6fd84572e35f26fe8479c4) what you would get if the file is still converting 🤔
* [Here's](https://gist.github.com/emsesc/6018bafcf24f02a58a8f7f14d52ffbb8) what you would get when the conversion is complete! (yay) 🥳


**In particular, there are 3 important pieces of the output we should examine:**
1. `update.status.code`: This tells us whether its done processing or not
2. `update.output[0].uri`: This gives us the URL we can download the PDF at (used in the last GET request)
3. `result.id`: Gives the ID of the file conversion "job" so we can continually check for its status

Before we can test our code, we need one last step: the trigger!

### Creating an Event Subscription
When the image blob is stored in the "images" container, we want the conversion from jpg/jpeg/png to pdf to begin *immediately*! 
> Just like how "subscribing" to a YouTube channel gives you notifications, we're going to subscribe to our own Blob Storage and trigger the Azure Function.

**Tip**: You'll want to keep the names for your storage account and resource group handy.

1. Search "Event Grid Subscriptions" in the search bar
2. Click "+ Event Subscription" in the top left
3. Fill in the form to create the Event Subscription:

![Filling in Name, Topic types, Subscription, resource group, and resource](https://user-images.githubusercontent.com/69332964/99469463-c10cf700-2910-11eb-929e-e7feff85f203.png)
* If it asks you for a name, feel free to put anything you want - I named it "fileUploaded"
* Under Topic Types, select "Storage Accounts"
* The "Resource Group" is the Resource Group that holds your storage account
* The "Resource" is your storage account name

**Note**: If your storage account doesn't appear, you forgot to follow the ["upgrade to v2 storage"](INSERT LINK) step

![Filling in Event Types](https://user-images.githubusercontent.com/69332964/99469567-05989280-2911-11eb-9cf2-827a604f638e.png)

* Under Event Types: filter to **Blob Created**

![Filling in Endpoint Type](https://user-images.githubusercontent.com/69332964/99189740-aed46280-2730-11eb-8ff0-c8a7ba19aadc.png)
* The "Endpoint Type" is "Azure Function"

![Filling in Endpoint Function](https://user-images.githubusercontent.com/69332964/99189763-d0354e80-2730-11eb-91e4-5b17fc5e63bd.png)
* The "Function" is the function we want triggered when an image is uploaded, so the `convertImage` function

4. Tweaking some settings...

* Navigate to the "Filters" tab and "Enable Subject Filtering"
![Filling in subject filters](https://user-images.githubusercontent.com/69332964/99189929-bd6f4980-2731-11eb-9b01-b0cef972b96a.png)
* Change the "Subject Begins With" to `/blobServices/default/containers/images/blobs/`
  * This way, the subscription will **not** trigger when a PDF is stored in the "pdfs" container. It will **only** trigger when something is stored in "images."

> **Congratulations!** You have now subscribed to the "blob created" event in your "images" container that triggers the convert image function!

### Upload a converted PDF to the "pdfs" container!
Now that we've connected our Functions and frontend together with an Event Grid Subscription, try submitting another image to check if it successfully uploads as a PDF into the "pdfs" container.

> If you used my code and have the same `context.log()`s, you should get something like this when the PDF uploads:
![Example output of console](https://user-images.githubusercontent.com/69332964/99191696-50ad7c80-273c-11eb-947e-5e9a9962ddb0.png)
