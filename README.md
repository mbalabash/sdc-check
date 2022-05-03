# sdc-check

Small tool to inform you about potential risks in your project dependencies list:

- **Lock file is not safe** (`lockfile-is-not-safe`). During the development process a malicious actor could replace URLs in a lock file to package with malicious code (it is especially dangerous because it is hard to catch in PR review)

- **The newest package version is too new** (`package-is-too-new`). A new version of a package could be vulnerable. It might be safer to wait X days before upgrading to the new version and let community test it

- **Installation Script** (`install-scripts`). An attacker can use installation scripts to run commands that perform malicious acts through the package installation step

- **Obfuscated code** (`obfuscated-code`). A package contains obfuscated code which may point to attempt of hiding potentially malicious code

- **A package has OS scripts** (`has-os-scripts`). An attacker can use .bat/.sh scripts to execute malicious actions (downloading and launching mining apps, etc)

- **A package script has shell commands** (`dangerous-shell-commands`). Package script could have potentially dangerous commands to perform malicious actions (curl, wget, chmod, cacls, etc)

- **The newest package version is released after a long period of inactivity** (`released-after-long-period-of-inactivity`). There is a possibility that an attacker could hijack an account and publish malicious code

- **Unmaintained Package** (`unmaintained-package`). A package has no updates for at least one year

- **Too many decision makers** (`too-many-decision-makers`). A package with too many maintainers/publishers will provide an attacker many targets to exploit account takeover and social engineering attacks

- **No source code repository** (`no-source-code`). When a package has no source code repository/homepage the access to review source code is restricted, forcing users to trust a package blindly

## Usage

### Add to your project

Add new npm command to script section in your `package.json`

```json
"scripts": {
  "sdc-check": "sdc-check -d .",
}
```

### Use in your CI pipeline

Add new step to your pipeline

```yaml
# Github Actions example:
- name: Check dependencies with sdc-check
run: yarn sdc-check
```

### Configure

Add new `"sdc-check"` section in your `package.json` to change defaults

- **options** define metrics behaviour
- **errors** define set of metrics when audit should fail if those metrics won't pass

```json
"sdc-check": {
  "options": {
    "limitOfDecisionMakers": 7,
    "daysBeforeUpgradeToNewVersion": 5,
    "monthsOfInactivityAllowed": 10
  },
  "errors": [
    "package-is-too-new",
    "lockfile-is-not-safe",
    "has-os-scripts",
    "dangerous-shell-commands"
  ]
}
```

### Ignore errors (do it wisely)

Add `.sdccheckignore` to your project root directory

```yaml
# Ignore errors caused by unmaintained-package metric for sdc-check@1.0.0
sdc-check@1.0.0 | unmaintained-package

# Ignore all errors for sdc-check@1.0.0
sdc-check@1.0.0

# Ignore errors caused by unmaintained-package and
# released-after-long-period-of-inactivity metrics for sdc-check
sdc-check | unmaintained-package, released-after-long-period-of-inactivity

# Ignore all errors for sdc-check
sdc-check
```

### Check npm package

Find out more about a package before adding it to your dependencies list

```sh
npx sdc-check -p ua-parser-js -v 1.0.2
```

### Wandering what has changed in the newest version of some package?

Use `npm diff` command to find out

```sh
npm diff --diff=dependency@1.2.3 --diff=dependency@1.3.5
```

## Common threats in supply chain security

1. **Malicious code injection**: During the development process an attacker could add malicious code to a package codebase (it is dangerous because it may be hard to catch in PR review).

2. **Malicious package release**: An attacker may publish malicious packages and hence trick other users into installing or depending on such packages.

3. **Social Engineering**: An attacker may manipulate a maintainer to hand over sensitive information.

4. **Account Takeover**: An attacker may compromise the credentials of a maintainer to inject malicious code under the maintainer’s name.

5. **Ownership transfer**: An attacker can show enthusiasm to maintain popular abandoned packages and transfer the ownership of a package.

6. **Remote execution**: An attacker may target a package by compromising the third-party services used by that package.

## Roadmap

| Status | Name                          | Description                                                                                                                                                                |
| ------ | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| To do  | **Expired Maintainer Domain** | An attacker can hijack a package if a maintainer’s domain is expired ([info](https://therecord.media/thousands-of-npm-accounts-use-email-addresses-with-expired-domains/)) |

## Install

```js
npm i -D sdc-check
```

or

```js
yarn add -D sdc-check
```

## Acknowledgments

- [What are Weak Links in the npm Supply Chain?](https://arxiv.org/abs/2112.10165v2)
- [NodeSecure](https://github.com/NodeSecure)
- [Security for package maintainers](https://sethmlarson.dev/blog/security-for-package-maintainers)


## License

MIT
