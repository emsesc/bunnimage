# Creating a File Sharing x Conversion Web App with Azure Applications + Online Convert API + Repl.it

> If you were a student, knew a student, or had a student that participated in this year's AP Collegeboard Exams, you may have either witnessed or felt the stress of submitting hand written work *virtually* and within a small time constraint.
![stress](https://media.giphy.com/media/3o7TKRwpns23QMNNiE/giphy.gif)

I wanted to create a project that was useful and applicable to 2020 as well as the future. This application was made with intentions of alleviating stress of tired high schoolers, but can also be used for those working at home. *However, it is arguable that creating this web app increased my stress levels, but we don't talk about that.*
**Essentially, *Bunnimage* takes an image as an input on an *upload* page, converts it into a PDF and is available at a *download* page. You can open the webpage on your phone and laptop, or really anywhere you need to send and receive an image.**

<br /> 
These are the portions the tutorial will be in:

1. Creating the "Upload" page and an HTTP Trigger Function that will upload the user's image to a storage container.
2. Setting up an Event Grid Subscription and a Function that converts the image into a PDF and stores it again. *The API lives here*
3. Creating the "Download" page and an HTTP Trigger Function that retrieve the correct PDF. 
4. **Optional** If you're not lazy, let's add another Function to delete the files and keep our containers sqeauky clean.

### Before we start:

* Make sure you have an [**Azure Subscription**](https://azure.microsoft.com/en-us/free/) so we can utilize the amazing features of Microsoft Azure Functions. (It's free!) 🤩
* If you want to host your website somewhere, check out [Repl.it](https://repl.it/languages/html), or you can just have your project run [locally](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)
* Register for an account on [Online Convert](https://www.online-convert.com/register) (of course with the free version), as we will be using this API convert our images

## Step 1: Upload the image ⬆️

### Creating a Function App
We're going to have a lot of triggers in this project, so we must get started by [creating a Function App](https://docs.microsoft.com/en-us/azure/azure-functions/functions-create-first-azure-function)! Create the Function App and proceed to create the first HTTP trigger (*this will upload our image*).

**Before we start coding the trigger, though, we need to install some npm packages/libraries.**

[`npm install parse-multipart`](https://www.npmjs.com/package/parse-multipart)

[`npm install node-fetch`](https://www.npmjs.com/package/node-fetch) *This will be used in our second Azure Function*

[`npm install @azure/storage-blob`](https://www.npmjs.com/package/@azure/storage-blob)

> Tip: The Azure Storage Blob client library is going to be a key piece of the project. After all, it's about blobs!

## Setting up your storage container
This is the storage container your created when creating the Function App. If you don't know what it is, search "Storage Containers" in the query box in Azure portal. 
1. We're going to need to create 2 containers: "images" and "pdfs"

![image](https://user-images.githubusercontent.com/69332964/99161767-75194280-26c3-11eb-8ad1-c19d63d37bbb.png)
![image](https://user-images.githubusercontent.com/69332964/99161780-8cf0c680-26c3-11eb-9bfc-78dc3262b038.png)

2. You will need to upgrade your storage account because Event Grid Subscriptions will only work with a v2 storage account.


```js
var multipart = require("parse-multipart");
const { BlobServiceClient } = require("@azure/storage-blob");
const connectionstring = process.env["AZURE_STORAGE_CONNECTION_STRING"];
const account = "bunnimagestorage";

module.exports = async function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');

    var boundary = multipart.getBoundary(req.headers['content-type']);
    // get boundary for multipart data 
    var body = req.body;
    // get raw body
    var parts = multipart.Parse(body, boundary);
    // parse body
    var username = req.headers['username'];
    // get username from request header

    var filetype = parts[0].type;

    if (filetype == "image/png") {
        ext = "png";
    } else if (filetype == "image/jpeg") {
        ext = "jpeg";
    } else {
        username = "invalidimage"
        ext = "";
    }

    var result = await uploadBlob(parts, username, ext);
    // call upload function to upload to blob storage

    context.res = {
            body: {
                    result
            }
    };

    console.log(result)
    context.done();
}

async function uploadBlob(img, username, filetype){
    // create blobserviceclient object that is used to create container client
    const blobServiceClient = await BlobServiceClient.fromConnectionString(connectionstring);
    // get reference to a container
    const container = "images";
    const containerClient = await blobServiceClient.getContainerClient(container);
    // create blob name
    const blobName = username + "." + filetype;
    // get block blob client
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    const uploadBlobResponse = await blockBlobClient.upload(img[0].data, img[0].data.length);
    console.log(`Upload block blob ${blobName} successfully`, uploadBlobResponse.requestId);
    result = {
        body : {
            name : blobName, 
            type: img[0].type,
            data: img[0].data.length,
            success: true,
            filetype: filetype
        }
    };
    return result;
}
```

* The parse-multipart library is being used here to parse the image from the POST request we will later make with the frontend; refer to the documentation linked above.
* I also have some logic to determine the filetype (there are definitely so many more efficient ways... 🤭)
* Take note of the process.env values being assigned to variables, use this [tutorial](https://docs.microsoft.com/en-us/azure/azure-functions/functions-how-to-use-azure-function-app-settings) to add in your own secret *shhhh* strings from your storage container. 
    * The storage container **is the one you created when you started your Function App.** Navigate to it add find your secret strings here:
    
    ![image](https://user-images.githubusercontent.com/69332964/99161798-ba3d7480-26c3-11eb-8e55-eac4bd4cb174.png)
    ![image](https://user-images.githubusercontent.com/69332964/99161822-ec4ed680-26c3-11eb-8977-f12beb496c24.png)
    * Keep these safe, and add use them in the corresponding variables in the code.
* Notice the `uploadBlob()` function! This is what's uploading the parsed image to the specified blob container.
    * [YouTube Video to help explain](https://youtu.be/Qt_VXM_fml4) the handy dandy library
<br />

### Frontend: The webpage
Next, I created a static HTML page that will accept the image from the user and send to the Azure Function we just coded with some JS.

*Note: I removed unnecessary sections of my code because I wanted to make the webpage ✨*fancy*✨, but you can see the whole thing [here](https://github.com/emsesc/bunnimage/blob/main/upload.html)*

```html
<!doctype html>
<html class="no-js" lang="zxx">

<head>
    <meta charset="utf-8">
    <meta http-equiv="x-ua-compatible" content="ie=edge">
    <title>Bunnimage</title>
    <meta name="description" content="">
    <link rel="icon" href="img/icon/3.svg"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <!-- CSS here -->
    <link rel="stylesheet" href="css/style.css">
    <!-- <link rel="stylesheet" href="css/responsive.css"> -->
</head>

<body>
    <!-- about  -->
    <div class="features_area ">
        <div class="container">
            <div class="features_main_wrap">
                    <div class="row  align-items-center">
                            <div class="col-xl-5 col-lg-5 col-md-6">
                                <div class="features_info2">
                                    <h3>Time to upload!</h3>
                                    <p>Submit your image here by attaching your file AND typing in your username. Remember to have the "download" page open on your receiving device!</p>
                                    <form id="image-form" onsubmit="handle(event)" enctype="multipart/form-data">
                                      <input class="label" type="file" onChange="loadFile(event)" accept="image/x-png,image/jpeg" name="image"></input>
                                      <img id="output" 
                                      class="img-fluid" src="img/logo.png"></img>
                                      <br></br>
                                      <input id="username" type="text" class="form-control" placeholder="Enter valid username">
                                      <br></br>
                                      <input class="boxed-btn3" type="submit" value="Submit Your Picture 📷"></input>
                                      <p id="submit">You haven't submitted anything.</p>
                                  </form>
                                </div>
                            </div>
                            <div class="col-xl-5 col-lg-5 offset-xl-1 offset-lg-1 col-md-6 ">
                                <div class="about_draw wow fadeInUp" data-wow-duration=".7s" data-wow-delay=".5s">
                                    <img id="upload" src="img/uploading.gif" alt="">
                                </div>
                            </div>
                    </div>
            </div>
    </div>

    <!-- JS here -->
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/1.11.3/jquery.min.js"></script>
    <script>window.jQuery || document.write('<script src="../../assets/js/vendor/jquery.min.js"><\/script>')</script>
    <script src="js/upload.js"></script>
</body>

</html>
```

Now, you may have noticed that I have `<script src="js/upload.js"></script>`, that is where we're heading next...

### Frontend: The Javascript

Simply put, this block of Javascript updates the preview thumbnail while getting the picture, gets the username, and sends them both over to the function we just coded.
```js
async function loadFile(event){
    console.log("Got picture!");
    var image = document.getElementById("output");
    // Get image from output 
    image.src = URL.createObjectURL(event.target.files[0])
    // load inputted image into the image src and display
}

async function handle(event) {
    event.preventDefault();
    document.getElementById("output").src = "img/logo.png";
    console.log("Loading picture");
    var username = document.getElementById("username").value;
    if (username.includes(' ') == true || username == '') {
      alert("Invalid username. A username cannot contain a space.");
      window.location.reload();
      return;
    }

    document.getElementById("upload").src = "img/doneupload.gif";
    $('#submit').html(`Thank you for your image, use "${username}" to receive your pdf.`);

    var myform = document.getElementById("image-form");
        var payload = new FormData(myform);

        console.log("Posting your image...");
        const resp = await fetch("https://bunnimage1.azurewebsites.net/api/uploadTrigger?code=Ia/3vNYiimrORzxaZRGlmdm695dnnSpCP0qd7R1k1WaUeRO2JUfGtg==", {
            method: 'POST',
            headers: {
                'username' : username
            },
            body: payload
        });

        var data = await resp.json();
        console.log(data);
        console.log("Blob has been stored successfully!")
}
```
