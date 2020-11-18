# Creating a File Sharing and Conversion Web App with Azure Applications, Online Convert API, and Repl.it

If you or someone you know participated in this year's AP Collegeboard Exams, you probably recognize the stress of submitting hand written work *virtually* within a small time constraint.

![Woman stressed gif](https://media.giphy.com/media/3o7TKRwpns23QMNNiE/giphy.gif)

*Bunnimage* aims to help alleviate that stress for students and others working at home. It takes an image as an input on an *upload* page, converts it into a PDF and is available at a *download* page. You can open the webpage on your phone and laptop, or really anywhere you need to send and receive an image.

However, it is arguable that creating this web app increased my stress levels, but we don't talk about that.

### Overview
![Flowchart for Bunnimage](https://user-images.githubusercontent.com/69332964/99191176-01198180-2739-11eb-9889-872822df6bd8.png)

**In this tutorial, we'll be walking through:**

1. Creating the "Upload" page and an HTTP Trigger Function that will upload the user's image to a storage container.
2. Setting up an Event Grid Subscription and a Function that converts the image into a PDF and stores it again. 
   - This is where the API will live!
3. Creating the "Download" page and an HTTP Trigger Function that retrieve the correct PDF. 
4. **Optional** For those who are interested, we can add another Function to delete the files and keep our containers squeaky clean. 
   - **Note**: The diagram above excludes the optional deletion feature.

You can find a sample of the final product at [my Github repository](https://github.com/emsesc/bunnimage). 

### Before we start:

* Make sure you have an [**Azure Subscription**](https://azure.microsoft.com/en-us/free/) so we can utilize the amazing features of Microsoft Azure Functions (It's free!) 🤩
* **Register** for an account on [**Online Convert**](https://www.online-convert.com/register) (with the free version), as we will be using this API convert our images
* If you want to host your website somewhere, check out [Repl.it](https://repl.it/languages/html), or you can just have your project run [locally](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)

## Step 1: Upload the image ⬆️

### Creating a Function App
We're going to have a lot of triggers in this project, so let's get started by [creating a Function App](https://docs.microsoft.com/en-us/azure/azure-functions/functions-create-first-azure-function)! Follow those steps to create the Function App, and then create the first HTTP trigger (*this will upload our image*).

> **Note: it will be helpful if you keep track of these strings for reference later in the project:**
> * Storage account name (found in "Hosting")
> * Function App name
> * Resource Group

Before we start coding the trigger, though, we need to install some npm packages/libraries.

Click on the "Console" tab in the left panel under "Development Tools".
![Console location in Azure Portal](https://user-images.githubusercontent.com/69332964/99189070-59e31d00-272d-11eb-80a4-17444e5fac65.png)

Inside the console (shown on the right panel), type in the following commands:

[`npm install parse-multipart`](https://www.npmjs.com/package/parse-multipart)  
[`npm install node-fetch`](https://www.npmjs.com/package/node-fetch)  
[`npm install @azure/storage-blob`](https://www.npmjs.com/package/@azure/storage-blob)  

> **Tip**: The Azure Storage Blob client library is going to be a key piece of the project. After all, it's about blobs!

## Setting up your storage account 
This is the storage account you created when creating the Function App. If you don't know what it is, search "Storage Containers" in the query box in Azure portal. 
1. We're going to need to create 2 containers: "images" and "pdfs." Think of these as folders in the account.

![Location of containers in storage account](https://user-images.githubusercontent.com/69332964/99161767-75194280-26c3-11eb-8ad1-c19d63d37bbb.png)
![Indicates where the add container button is](https://user-images.githubusercontent.com/69332964/99161780-8cf0c680-26c3-11eb-9bfc-78dc3262b038.png)

2. You will need to upgrade your storage account because Event Grid Subscriptions will only work with a v2 version. Follow this [tutorial](https://docs.microsoft.com/en-us/azure/storage/common/storage-account-upgrade?tabs=azure-portal) to upgrade it.

vv This code snippet has absolutely no context? You need to introduce it somehow.
It would also be preferable to, if possible, to break your code up into several smaller sections, instead of a huge monolith.
That way it's easier to follow along as a reader.
Also, please include large code snippets as Github Gists (that way we can also have line numbers), and readers can easily fork them.

<script src="https://gist.github.com/emsesc/d09a6d7c0caa1318d8e184ebf412c185.js"></script>

<script src="https://gist.github.com/emsesc/8177c15fea34c208bc9a7fc9ea0bc585.js"></script>

* Notice that we are able to name the file with the user's username by receiving it from the header. *Scroll down to see how we sent the username in the header* <- **This is not clear at all, you need to reference a line number**
* The `parse-multipart` library is being used here to parse the image from the POST request we will later make with the frontend; refer to the documentation linked above.
* Take note of the `process.env` values being assigned to variables. Use this [tutorial](https://docs.microsoft.com/en-us/azure/azure-functions/functions-how-to-use-azure-function-app-settings) to add in your own secret strings from your storage container. 
    * The storage container is the one you created when you started your Function App. Navigate to it and find your secret strings here:
    
    ![Indicates where access keys are](https://user-images.githubusercontent.com/69332964/99161798-ba3d7480-26c3-11eb-8e55-eac4bd4cb174.png)
    ![What the access keys page looks like](https://user-images.githubusercontent.com/69332964/99161822-ec4ed680-26c3-11eb-8977-f12beb496c24.png)
    * Keep these safe, and use the first key and connection string in the corresponding variables in the code.
* I can't! Give me a line number! -> Notice the `uploadBlob()` function! This is what uploads the parsed image to the specified "images" blob container.
    * Here's a [YouTube Video to help explain](https://youtu.be/Qt_VXM_fml4) the handy dandy library

### Frontend: The webpage
Next, I created a static HTML page that will accept the image from the user and send to the Azure Function we just coded using Javascript.

*Note*: I removed unnecessary sections of my code because I wanted to make the webpage ✨*fancy*✨, but you can see the whole thing [here](https://github.com/emsesc/bunnimage/blob/main/upload.html)

vvv Again, please don't post entire files. As a reader they're an awful barrier for entry. Highlight the necessary parts and move on. For example, including the head section is not really necessary.

<script src="https://gist.github.com/emsesc/faaa81463826cb383110d86071ace146.js"></script>

**Above we have:**
* Input box for the username (simple but *insecure* auth system)
* Button to submit

Now, you may have noticed that I have `<script src="js/upload.js"></script>`, that is where we're heading next... <-- Where!! Line numbers or snippets, please.

### Frontend: Javascript for interacting with the Azure Function

This block of Javascript updates the preview thumbnail while getting the picture, gets the username, and sends them both over to the function we just coded.

First, `loadFile()` is called when the file input changes to display the thumbnail.
```js
async function loadFile(event){
    console.log("Got picture!");
    var image = document.getElementById("output");
    // Get image from output 
    image.src = URL.createObjectURL(event.target.files[0])
    // load inputted image into the image src and display
}
```

Then, `handle()` is called when the file is submitted to POST the image and username. The image is sent in the body, and username is sent as a header.

<script src="https://gist.github.com/emsesc/b4d045380641847163399aa4fed6841e.js"></script>

> Be sure to change the function url (**where**) to the one of your upload image Function!
![Indicates where the "Get Function URL" button is](https://user-images.githubusercontent.com/69332964/99188529-73369a00-272a-11eb-93df-04fdce5381df.png)

### Deploy your code
* Try locally with the **live server extension** for VS Code
* Try [Azure Web Apps](https://azure.microsoft.com/en-us/services/app-service/web/)
* I personally used [repl.it](https://repl.it/languages/html)

### Update CORS Settings
> **This is a crucial step!!** 😱 If you don't change your CORS (Cross-origin resource sharing) settings, **the POST request won't work**. This tells the Function App what domains can access our Azure Function.

**Options:** 
* **Recommended**: Change it to a wildcard operator (`*`), which allows *all* origin domains to make requests
    * Be sure to remove any other existing inputs before attempting to save with wildcard
![Indicates where CORS settings are](https://user-images.githubusercontent.com/69332964/99188905-6f0b7c00-272c-11eb-8142-f91882227c78.png)
* Change it to your domain you are using to host your code

### Home stretch! 🏃🏻‍♀️
**It's finally time to test our first step that our app will make!**

1. Navigate to your HTML page and submit an image

![Bunnimage webpage appearance before submitting an image](https://user-images.githubusercontent.com/69332964/99189240-3cfb1980-272e-11eb-8896-e959f37480b3.png)
![Bunnimage webpage appearance after submitting an image](https://user-images.githubusercontent.com/69332964/99189255-53a17080-272e-11eb-9cab-a73faf504b3f.png)

2. Go to the "images" storage container and check to see if your image is there!
    *Error? Check the log in your Function*
![What the "images" storage container should look like after Step 1](https://user-images.githubusercontent.com/69332964/99189316-9c592980-272e-11eb-9870-dbc1f9352599.png)
