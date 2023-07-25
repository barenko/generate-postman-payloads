'use strict'

const newman = require('newman');
const fs = require('fs-extra');
const chalk = require( 'chalk' )
const argv = require( 'minimist' )( process.argv.slice( 2 ) );

const help = () => {
    console.log( 'Usage:' )
    console.log( chalk.yellow( '\tnode generate-payloads.js [OPTIONS]\\' ) )
    console.log( chalk.red( '\t\t--postman=/path/to/postman/collection.json \\' ) )
    console.log( chalk.blue( '\t\t--output=/path/to/save \\' ) )
    console.log( chalk.blue( '\t\t--posfix=posfix-name \\' ) )
    console.log( 'Where:' )
    console.log( `\t${chalk.red( 'postman' )}: path to postman collection. Required!` )
    console.log( `\t${chalk.blue( 'output' )}: path to where the responses will be saved. Optional. Default: ./responses-<branch>` )
    console.log( `\t${chalk.blue( 'posfix' )}: Folder name posfix. Optional` )
    console.log( `\t${chalk.blue( 'overwrite' )}: Overwrite the output folder. Optional` )
}

if( argv.h || argv.help ){
    help()
    process.exit( 0 )
} else if(!argv.postman){
    console.log(chalk.red(`ERROR: postman parameter is required\n\n`))
    help()
    process.exit(1)
}


// Replace 'path/to/your/postman_collection.json' with the actual path to your Postman collection JSON file
const collectionFile = argv.postman;
const outputFolder = argv.output || 'responses'+(argv.posfix && '-'+argv.posfix || '');

if(argv.overwrite){
    fs.rmSync(outputFolder, { recursive: true, force: true });
}

// Run the Postman collection
newman.run({
    collection: require(collectionFile),
    reporters: 'cli',
}).on('start', function (err, args) {
    if (!fs.existsSync(outputFolder)) {
        fs.mkdirSync(outputFolder);
    }
}).on('request', function (err, args) {
    const folderName = collectionFile.replace(/.*\b([^.]+).postman_collection.json/, '$1').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const fileName = `${folderName}.${args.item.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;

    const body = args.request?.body?.toString();

    const headersMembers = args.request.headers.members.filter(member => member.key !== 'Postman-Token');
    args.request.headers.members = headersMembers;

    const response = {
        request: {
            method: args.request.method,
            url: args.request.url.toString(),
            headers: args.request.headers,
            body: body && JSON.parse(body.toString()),
        },

        response: {
            code: args.response.code,
            body: JSON.parse(args.response.stream.toString()),
        },
    };

    fs.writeFileSync(`${outputFolder}/${fileName}`, JSON.stringify(response, null, 2));
}).on('done', function (err, summary) {
    if (err || summary.error) {
        console.error('Collection run encountered an error.');
    } else {
        console.log('Collection run completed.');
    }
});