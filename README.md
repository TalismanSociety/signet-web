# Signet

Signet is a multisig coordination interface built by [Talisman](https://github.com/TalismanSociety), allowing users to create, manage, and sign multisig transactions across supported Substrate-based chains.

> **Note:** This frontend requires a locally running instance of the [Signet Backend](https://github.com/TalismanSociety/signet-backend). Be sure to start the backend before using the app.

## 🛠️ Getting Started

1. Clone and start the backend:

```sh
git clone https://github.com/TalismanSociety/signet-backend
cd signet-backend
```

Follow the README instructions to install dependencies and start the server

2. Start the frontend:

```sh
# 1. Run yarn so it automatically links all the dependencies
yarn

# 2. cd into the web app
cd apps/multisig

# 3. set up environment variables and replace the variables with appropriate values
cp .env.example .env

# 4. Start the dev server
yarn dev

```

## How to self host Signet with Docker

1. Clone the repo:

```sh
git clone https://github.com/TalismanSociety/signet-web.git
```

2. Copy `.env.example` to `.env` and update the values:

```sh
cp .env.example .env
```

3. Start the docker instance:

```sh
docker compose up --build
```

## Configuring the Networks

In some cases, you may want to configure the networks allowed in your self hosted Signet. Signet allows customising the networks that appear on your frontend using the `REACT_APP_NETWORKS` environment variable.

Note: Use `NETWORKS` as your docker arg when running with docker.

There are 4 modes when using the `REACT_APP_NETWORKS` flag:

- Testnets only: Use `testnet` to show Westend and Rococo networks only
- Non testnets: Use `non-testnet` to show Polkadot, Kusama, Polkadot AssetHub and Kusama AssetHub
- Custom filter: Alternatively, you can also filter only the list of chains you want to display using their names, separated by comma with no space. For example: `polkadot,kusama`. For the list of chains supported, check `apps/multisig/src/domains/chains/supported-chains.ts#L3`
- Show everything: Omit the flag if you want to show every supported chains.
