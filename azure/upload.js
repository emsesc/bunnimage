var multipart = require("parse-multipart");
const { BlobServiceClient } = require("@azure/storage-blob");
const connectionstring = process.env["AZURE_STORAGE_CONNECTION_STRING"];
const account = "storageaccountbunnib914";

module.exports = async function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');

    var boundary = multipart.getBoundary(req.headers['content-type']);
    // get boundary for multipart data 
    var body = req.body;
    // get raw body
    var parts = multipart.Parse(body, boundary);
    // parse body

    var result = await uploadBlob(parts);
    // call upload function to upload to blob storage

    context.res = {
            body: {
                    result
            }
    };

    console.log(result)
    context.done();
}

async function uploadBlob(img){
    // create blobserviceclient object that is used to create container client
    const blobServiceClient = await BlobServiceClient.fromConnectionString(connectionstring);
    // get reference to a container
    const container = "images";
    const containerClient = await blobServiceClient.getContainerClient(container);
    // create blob name
    const blobName = img[0].filename;
    // get block blob client
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    const uploadBlobResponse = await blockBlobClient.upload(img[0].data, img[0].data.length);
    console.log(`Upload block blob ${blobName} successfully`, uploadBlobResponse.requestId);
    result = {
        body : {
            name : img[0].filename, 
            type: img[0].type,
            data: img[0].data.length,
            success: true
        }
    };
    return result;
}
