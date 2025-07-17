<div align="center">
  <a href="https://www.normalfinance.io/protocol">
    <img src="https://cdn.prod.website-files.com/6595b2282ea917577755d3a5/6595bb9290625dfff5df3f7e_Logo%20-%20Color.svg" alt="Normal logo" width="340"/>
  </a>
</div>

<div>
  <a href="https://discord.gg/hayb9pafjZ"><img src="https://img.shields.io/discord/928701482319101952"/></a>
  <a  href="https://github.com/normalfinance/normal-v1-interface/releases"><img src="https://img.shields.io/github/release-pre/normalfinance/normal-v1-interface.svg"/></a>
  <a  href="https://github.com/normalfinance/normal-v1-interface/pulse"><img src="https://img.shields.io/github/contributors/normalfinance/normal-v1-interface.svg"/></a>
  <a href="https://opensource.org/license/apache-2-0"><img src="https://img.shields.io/github/license/normalfinance/normal-v1-interface"/></a>
  <a href="https://github.com/normalfinance/normal-v1-interface/pulse"><img src="https://img.shields.io/github/last-commit/normalfinance/normal-v1-interface.svg"/></a>
  <a href="https://github.com/normalfinance/normal-v1-interface/pulls"><img src="https://img.shields.io/github/issues-pr/normalfinance/normal-v1-interface.svg"/></a>
 
  <a href="https://github.com/normalfinance/normal-v1-interface/issues"><img src="https://img.shields.io/github/issues/normalfinance/normal-v1-interface.svg"/></a>
  <a href="https://github.com/normalfinance/normal-v1-interface/issues"><img src="https://img.shields.io/github/issues-closed/normalfinance/normal-v1-interface.svg"/></a>
</div>

# Normal v1 - Interface 👀

The Normal v1 Interface is built with TypeScript and leverages yarn workspaces for package management. You'll find multiple packages in the `/packages` directory, each serving a unique function in the overall application ecosystem.

## Packages

### [Types](https://github.com/normalfinance/normal-v1-interface/tree/main/packages/types)

The `Types` package focuses on state management, incorporating zustand along with its actions to optimally manage and update the app's data based on user interactions and other events.

### [Utils](https://github.com/normalfinance/normal-v1-interface/tree/main/packages/utils)

Housing a range of utility and helper functions, the `Utils` package offers a one-stop-shop for common tasks like data manipulation, date formatting, string handling, and network calls.

### [State](https://github.com/normalfinance/normal-v1-interface/tree/main/packages/state)

The `State` package focuses on state management, incorporating zustand along with its actions to optimally manage and update the app's data based on user interactions and other events.

### [Web](https://github.com/normalfinance/normal-v1-interface/tree/main/packages/solana/web)

As the heart of the application, the `Core` package orchestrates the UI, state management, and utility functions. It's built on Next.js and serves as the primary entry point, setting the architectural groundwork and facilitating inter-package interactions.

### [Contracts](https://github.com/normalfinance/normal-v1-interface/tree/main/packages/stellar/contracts)

The `Contracts` package provides generated contract classes and associated types, created through Soroban bindings. For more information, refer to [Soroban's documentation](https://soroban.stellar.org/docs/getting-started/create-an-app#generate-an-npm-package-for-the-hello-world-contract).

## Quick Start

1. Clone the repo locally.
2. Make sure Node.js and yarn are installed.
3. Cd into the project root.
4. Run `yarn install`.
5. Navigate to the package you're interested in under `/packages`.
6. Check the package-specific readme for setup and usage instructions.

## Authors

-   [@jmoneynormal](https://www.github.com/jmoneynormal)

## Contributing

Contributions are always welcome!

See `contributing.md` for ways to get started.

Please adhere to this project's `code of conduct`.

## License

[Apache-2.0](https://choosealicense.com/licenses/apache-2.0/)

Deploy with updated translation keys in CI