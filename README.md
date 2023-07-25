# Generate postman payloads

This project uses a postman collection to execute and save all requests and payloads in a folder, with each request/response as a json file.

## Installation

- Install NodeJS (recommended 12 or higher)

Download the packages with npm:

    npm i

## How to use

Run the project as:

    node ./generate-payloads.js --postman /path/to/postman_collection.json

To see the options, run:

    node ./generate-payloads.js -h

The project will generate the output folder in current working directory or in the --output specified path.
