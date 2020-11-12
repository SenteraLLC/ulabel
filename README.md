# ULabel

A browser-based tool for annotating images with aleatoric uncertainty

## Development

### Quick Start:

```
git clone git@github.com:SenteraLLC/ULabel.git
cd ULabel
git checkout migrate
npm install
node demo/server.js
```

Tested on Ubuntu 18.04 + Google Chrome 86.0. 

Depends:
- npm (`sudo apt install npm`)
- nodejs (`sudo apt install nodejs`)

## SageMaker Deployment

Instructions for creating a custom labeling job using this tool can be found [on confluence](https://sentera.atlassian.net/wiki/spaces/DS/pages/1739849729/Custom+Sagemaker+Labeling+Jobs). For the "Template" field, use the `sagemaker/template.liquid.html` file in this repository.