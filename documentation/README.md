# Website
# Local Development

This website is built using [Docusaurus](https://docusaurus.io/), a modern static website generator.

## Prerequisites

- **Node.js and nvm:**  
  Make sure you have [Node Version Manager (nvm)](https://github.com/nvm-sh/nvm) installed. If you don't have it, please install it first.

## Getting Started

1. **Navigate to the right path:**

	Make sure you are in the `/website/` folder.

2. **Switch to the Correct Node Version:**
   Run the following command to use the Node version specified in the `.nvmrc` file:

   ```bash
   nvm use
   ```

   If you don't have the correct version installed, you'll see a message like:

   ```bash
   Found '/wp-content/plugins/yoko-core/.nvmrc' with version <20.10.0>
   N/A: version "v20.10.0" is not yet installed.

   You need to run `nvm install` to install and use the node version specified in `.nvmrc`.
   ```

   In that case, simply run:

   ```bash
   nvm install
   ```

3. **Install Dependencies:**

   ```
   npm i
   ```


4. **Start the development server:**

   ```
   npm start
   ```
   Running npm start will launch a local development server and automatically open a browser window. Most changes are reflected live without the need to restart the server.