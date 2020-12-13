# ULabel

A browser-based tool for annotating images with aleatoric uncertainty

## Local

### Requirements
- npm (`sudo apt install npm`)
- nodejs (`sudo apt install nodejs`)


### Installation

First, follow the install instructions for [py-analytics-db](https://github.com/SenteraLLC/py-analytics-db). You must also set the environment variables as described [here](https://github.com/SenteraLLC/py-analytics-db#credentials).

Next, clone this repository and switch to the `migrate` branch.

```bash
git clone git@github.com:SenteraLLC/ULabel.git
cd ULabel
git checkout migrate
```

Next, install the wrapper package for `py-analytics-db` within `ulabel_local`

```bash
cd ulabel_local
pyenv install
cd dbapi
poetry install
cd ../..
```

Finally, install ULabel's JavaScript dependencies

```bash
npm install
```

### Usage

You should now be able to run the launcher from the repository root.

```bash
pwd # Should be /path/to/ULabel
node ulabel_local/server.js
```

