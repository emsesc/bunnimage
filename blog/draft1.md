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

### Frontend: The webpage
Next, I created a static HTML page that will accept the image from the user and send to the Azure Function we just coded.

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
