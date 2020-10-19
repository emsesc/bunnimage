async function handle(event) {
    event.preventDefault();
    var username = document.getElementById("username").value;
    $('#submit').html(`Trying to find pdf with "${username}"...`);
    // $('#emotion').html("Loading...");
    // target the output element ID and change content
    // stop the page from reloading

    var myform = document.getElementById("image-form");
        console.log("Attempting to get your pdf...");
        const resp = await fetch("https://bunnimage.azurewebsites.net/api/downloadphoto?code=P/hVtVxI4bK3p5EAOrRaCwfDsZMwj1EmoQDBS78TvlG3azwp06Z4Ng==", {
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
          document.getElementById('getLink').setAttribute('onclick',`window.open('${link}')`);
          document.getElementById("getLink").style.visibility = "visible";
          var element = document.getElementById("refresh");
          element.parentNode.removeChild(element);
          document.getElementById("upload").src = "img/downloadsuccess.gif";
        }
}