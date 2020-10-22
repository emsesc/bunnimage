function loadFile(event){
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
        const resp = await fetch("https://bunnimage2.azurewebsites.net/api/uploadImage?code=Hg2ASs7PsCx2hU9lyzBoNRBNH58uMcKJuLYP6E9bkzuzz9XTjCf41Q==", {
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