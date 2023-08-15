//'use strict'

const newman = require('newman')
const fs = require('fs-extra')
const chalk = require( 'chalk' )
const jp = require('jsonpath')
const argv = require( 'minimist' )( process.argv.slice( 2 ) )
const { createHash } = require('node:crypto')
const json = require('json-keys-sort')

const md5 = (content) => createHash('md5').update(JSON.stringify(content)).digest('hex')

const arraySort = (arr) => arr.map(deepSort).sort(sortArray, (a, b) => md5(a).localeCompare(md5(b)))

const deepSort = (obj)=> Array.isArray(obj) ? arraySort(obj) : json.sort(obj)

const help = () => {
    console.log( 'Usage:' )
    console.log( chalk.yellow( '\tnode generate-payloads.js \\' ) )
    console.log( `\t\t[${chalk.red( '--postman' )}=/path/to/postman/collection.json] \\` )
    console.log( `\t\t[${chalk.blue( '--output' )}=/path/to/save] \\` )
    console.log( `\t\t[${chalk.blue( '--overwrite' )}] \\` )
    console.log( `\t\t[${chalk.blue( '--sort' )}] \\` )
    console.log( `\t\t[${chalk.blue( '--sensitiveHeaders' )}=key1;key2] \\` )
    console.log( `\t\t[${chalk.blue( '--sensitiveRequestFields' )}=key1;key2] \\` )
    console.log( `\t\t[${chalk.blue( '--sensitiveResponseFields' )}=key1;key2] \\` )
    console.log( '\nWhere:' )
    console.log( `\t${chalk.red( 'postman' )}:   Path to postman collection. Required!` )
    console.log( `\t${chalk.blue( 'output' )}:    Path to where the responses will be saved. Optional. Default: ./responses` )
    console.log( `\t${chalk.blue( 'overwrite' )}: Overwrite the output folder. Optional` )
    console.log( `\t${chalk.blue( 'sort' )}: Indicate if the fields need to be sorted. Optional.` )
    console.log( `\t${chalk.blue( 'sensitiveHeaders' )}: List of headers to be censured in the output files, separated by comma. Optional. Default: Postman-Token` )
    console.log( `\t${chalk.blue( 'sensitiveRequestFields' )}: List of payload fields to be censured in the output files, separated by comma. Each field must be described using jsonpath from 'request'. Optional. References: ${chalk.green('https://www.npmjs.com/package/jsonpath')}` )
    console.log( `\t${chalk.blue( 'sensitiveResponseFields' )}: List of payload fields to be censured in the output files, separated by comma. Each field must be described using jsonpath from 'response'. Optional. References: ${chalk.green('https://www.npmjs.com/package/jsonpath')}` )
    console.log( '\nExamples:' )
    console.log(`\tnode generate-payloads.js --postman=MyApi.postman_collection.json\n`)
    console.log(`\tnode generate-payloads.js --postman=MyApi.postman_collection.json --output=./api-output --overwrite\n`)
    console.log(`\tnode generate-payloads.js --postman=MyApi.postman_collection.json --sensitiveHeaders=Cookie;Authorization\n`)
    console.log(`\tnode generate-payloads.js --postman=MyApi.postman_collection.json --sensitiveResponseFields=$.access_token;$.data[*].customer.cpf[*];$.creation_date\n`)
    console.log(`\tnode generate-payloads.js --postman ./ReclameAqui.postman_collection.json --sensitiveHeaders=Authorization,Cookie --sensitiveResponseFields='$..access_token;$..creation_date;'\n`)
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
const sortArray = [...argv.sortArray?.split(/\s*[;,:]\s*/) ?? []]
const sensitiveHeaders = [...argv.sensitiveHeaders?.split(/\s*[;,:]\s*/)??[], 'Postman-Token']
const sensitiveRequestFields = argv.sensitiveRequestFields?.split(/\s*[;,:]\s*/) ?? []
const sensitiveResponseFields = argv.sensitiveResponseFields?.split(/\s*[;,:]\s*/) ?? []
const outputFolder = argv.output || 'responses';

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

    args.request.headers.members.map(h => {
        if(sensitiveHeaders.includes(h.key) && h.value){
            h.value = 'CONFIDENTIAL'
        }
    })

    const requestBody = JSON.parse(args.request?.body?.toString()||'{}')
    let responseBody = JSON.parse(args.response.stream.toString()||'{}')

    sensitiveRequestFields.forEach((i)=>{
        jp.apply(requestBody, i, v=>'CONFIDENTIAL')
    })

    sensitiveResponseFields.forEach((i)=>{
        jp.apply(responseBody, i, v=>'CONFIDENTIAL')
    })

    if(sortArray){
        responseBody = deepSort(responseBody)
    }

    const response = {
        request: {
            method: args.request.method,
            url: args.request.url.toString(),
            headers: args.request.headers,
            body: requestBody,
        },

        response: {
            code: args.response.code,
            body: responseBody,
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