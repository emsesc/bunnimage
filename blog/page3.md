## Step 3: Downloading the PDF on the HTML page ⬇
Now that we have a PDF stored in the "pdfs" container, how will we get the PDF back to the user? **You got it right, yet *another* Azure Function**!

Create another HTTP Trigger - this one will return the PDF download URL to the frontend when triggered.

**Commercial Break** 📺
Let's recap:
* **Step 1 ✅:** We created the "Upload" page and an HTTP Trigger Function that uploaded the user's image to a storage container.
* **Step 2 ✅:** We will create an **Event Grid** function that converts the image into a PDF by calling the *Online Convert API* and will upload the PDF to blob storage.
* **Step 3:** We will create a HTTP Trigger function that returns the PDF to the user when triggered by the "Download" page.
* **Step 4:** ***Optional*** If you choose, create another HTTP Trigger function and modify other code to delete the image and PDF blobs from storage containers once they are unneeded.

### Azure Functions: Check if the PDF is ready to be served 🍝

First, it receives the username to get the correct PDF from the header of the request, which is made by the webpage.
```js
var fetch = require("node-fetch");
module.exports = async function (context, req, inputBlob) {
    context.log('JavaScript HTTP trigger function processed a request.');

    var username = req.headers['username'];
    var download = "https://bunnimagestorage.blob.core.windows.net/pdfs/" + username + ".pdf";
```

Then, using the personalized URL, it performs a GET request to check if the PDF has been stored in the "pdfs" container.
```js
    let resp = await fetch(download, {
        method: 'GET',
    })
    let data = await resp;
    if (data.statusText == "The specified blob does not exist.") {
        success = false;
        context.log("Does not exist: " + data)
    } else {
        success = true;
        context.log("Does exist: " + data)
    }

```

The function then returns the URL for downloading the PDF and whether or not the PDF is ready for download to the webpage.
```js
    context.res = {
            body: {
                    "downloadUri" : download,
                    "success": success,
            }
    };
    // receive the response

    context.log(download);
    context.log(data)
    context.done();
}
```

### Frontend: Creating the Download HTML page

Once again, the "fancy" stuff is omitted. <!-- but please omit the unnecessary stuff ... ! -->
```html
<!doctype html>
<html class="no-js" lang="zxx">

<head>
    <meta charset="utf-8">
    <meta http-equiv="x-ua-compatible" content="ie=edge">
    <title>Bunnimage</title>
    <link rel="icon" href="img/icon/2.svg"/>
    <meta name="description" content="">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <link rel="stylesheet" href="css/style.css">
</head>

<body>
    <div class="features_area ">
        <div class="container">
            <div class="features_main_wrap">
                    <div class="row  align-items-center">
                            <div class="col-xl-5 col-lg-5 col-md-6">
                                <div class="features_info2">
                                    <h3>Download Your File</h3>
                                    <p>Type in your username and continually refresh to check for your pdf.</p>
                                    <form id="image-form" onsubmit="handle(event)" enctype="multipart/form-data">
                                      <img id="output" 
                                      class="img-fluid"></img>
                                      <input class="boxed-btn1" type="button" value="Download Another Picture" onclick="window.location.reload();"></input>
                                      <br></br>
                                      <input id="username" type="text" class="form-control" placeholder="Enter valid username">
                                      <br></br>
                                      <input class="boxed-btn3" type="submit" value="Refresh" id="refresh"></input>
                                      <input style="visibility: hidden" class="boxed-btn3" type="button" value="Download File" id="getLink" download target="_blank"></input>
                                      <p id="submit">Type in the username you used to upload and click refresh.</p>
                                  </form>
                                </div>
                            </div>
                            <div class="col-xl-5 col-lg-5 offset-xl-1 offset-lg-1 col-md-6 ">
                                <div class="about_draw wow fadeInUp" data-wow-duration=".7s" data-wow-delay=".5s">
                                    <img id="upload" src="img/downloading.gif" alt="">
                                </div>
                            </div>
                    </div>
            </div>
    </div>

    <script src="js/download.js"></script>
</body>

</html>
```
<!-- This needs a better segue from the code -->
This piece of code creates:
- An input for the username
- One button for refreshing to check if the PDF is ready
- One button for downloading the file

### Frontend: Downloading the PDF on the Webpage

<!-- Intersperse these comments with your code -->
Before we get bombarded with code again, here's what the script does:
* Change the HTML to display the current status (whether it's looking for the PDF, whether it's ready for download, etc.)
* Make a request to the HTTP Trigger Function we just coded, sending the username inputted on the HTML page along with it
* Change buttons from "Refresh" to "Download" when PDF is ready for download
  * Remove the "Refresh" button and make "Download" visible
* Set the `onclick` attribute of the "Download" button to call the `getPdf()` function with the unique username + link for download. 
  * The `getPdf()` function allows for immediate download with `window.open(link)`
  
```js
async function handle(event) {
    event.preventDefault();
    var username = document.getElementById("username").value;
    $('#submit').html(`Trying to find pdf with "${username}"...`);
    // target the output element ID and change content
    // stop the page from reloading

    var myform = document.getElementById("image-form");
        console.log("Attempting to get your pdf...");
        const resp = await fetch("https://bunnimage1.azurewebsites.net/api/downloadTrigger?code=ryCKYqZQJpiq9bagb4Nmifbg6pFZvcyfsNmF4GEybYaL68bGsbdrNA==", {
            method: 'GET',
            headers: {
                'username' : username
            },
        });

        var data = await resp.json();
        console.log("PDF link received!")
        console.log(data.downloadUri)
        console.log(data.success)
        const link = data.downloadUri
        var success = data.success

        if (!success) {
          $('#submit').html(`Your file named ${username}.pdf has not been converted yet. Please continue refreshing!`)
        } else {
          $('#submit').html(`Found ${username}.pdf! Click to Download.`);
          document.getElementById('getLink').setAttribute('onclick',`getPdf("${link}", "${username}")`);
          document.getElementById("getLink").style.visibility = "visible";
          var element = document.getElementById("refresh");
          element.parentNode.removeChild(element);
          document.getElementById("upload").src = "img/downloadsuccess.gif";
        }
}

function getPdf(link, username) {
  window.open(link);
  document.getElementById("getLink").disabled = true;
}
```

## Amazing! You're done! 

Here's the finished product in which I download the cute bunny shopping picture I uploaded earlier.
![Bunnimage webpage before clicking refresh](https://user-images.githubusercontent.com/69332964/99192741-95d4ad00-2742-11eb-8b77-f0c9e6d159d7.png)
![Bunnimage webpage after clicking refresh and downloading pdf](https://user-images.githubusercontent.com/69332964/99192756-b00e8b00-2742-11eb-9fea-dc64a9083c63.png)
![The downloaded PDF of the bunny shopping picture](https://user-images.githubusercontent.com/69332964/99192766-bbfa4d00-2742-11eb-8371-630af1b21778.png)

**Challenge: *Use your new knowledge of Blob Storage, HTTP Triggers, the Node SDK (@azure/storage-blob), and some [Stack Overflow](https://stackoverflow.com/questions/60716837/how-to-delete-a-blob-from-azure-blob-v12-sdk-for-node-js) to assist you to add a feature to delete the image and PDF blobs.***
> Tip: You will need to create [this function](https://github.com/emsesc/bunnimage/blob/main/azure/deletePDF.js), update [this JavaScript](https://github.com/emsesc/bunnimage/blob/main/js/download.js), and add some code [to this](https://github.com/emsesc/bunnimage/blob/main/azure/convertImage.js)
