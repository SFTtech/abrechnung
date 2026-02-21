# Changelog

## Unreleased

[Compare the full difference.](https://github.com/SFTtech/abrechnung/compare/v1.7.1...HEAD)

## 1.7.1 (2026-02-21)

- prevent accounts which are not yet saved to the server from being referenced in transactions

[Compare the full difference.](https://github.com/SFTtech/abrechnung/compare/v1.7.0...v1.7.1)

## 1.7.0 (2026-02-21)

[Compare the full difference.](https://github.com/SFTtech/abrechnung/compare/v1.6.0...v1.7.0)

- add French translation
- remember selected language
- rework balance table into a basic statistics page with lifetime group statistics

## 1.6.0 (2026-01-10)

[Compare the full difference.](https://github.com/SFTtech/abrechnung/compare/v1.5.0...v1.6.0)

- add alternative split modes: evenly, unevenly - by shares, unevenly - by percentage, unevenly - by amount

## 1.5.0 (2026-01-05)

[Compare the full difference.](https://github.com/SFTtech/abrechnung/compare/v1.4.0...v1.5.0)

- add group export and import via json dumps
- allow empty valid until in group invite links

## 1.4.0 (2026-01-03)

[Compare the full difference.](https://github.com/SFTtech/abrechnung/compare/v1.3.0...v1.4.0)

- enable Russian and Bulgarian translations
- make valid until field of invite links fully optional
- persist filter and sort settings of list views across page navigations

## 1.3.0 (2025-12-30)

[Compare the full difference.](https://github.com/SFTtech/abrechnung/compare/v1.2.0...v1.3.0)

**Features**

- select accounts as "owned" to set a default payer for purchases and transfers as well as
  displaying balance effects directly
- fetch current currency conversion rates from external api
- various UI polishes and improvements

## 1.2.0 (2025-06-19)

[Compare the full difference.](https://github.com/SFTtech/abrechnung/compare/v1.1.0...v1.2.0)

**Features**

- add transaction history display
- add multi currency support
- add support for math expressions in numeric inputs

## 1.1.0 (2025-01-31)

[Compare the full difference.](https://github.com/SFTtech/abrechnung/compare/v1.0.0...v1.1.0)

**Features**

- add optional prometheus metrics endpoint
- make mailer service tolerant to database restarts

## 1.0.0 (2025-01-03)

[Compare the full difference.](https://github.com/SFTtech/abrechnung/compare/v0.14.0...v1.0.0)

**BREAKING CHANGES**

- changed config structure to only include the reverse-proxy base_url once in the `api` section
- removed frontend config via separate `config.json` in favour of configuration in the backend config yaml
- drop python 3.10 support
- add ubuntu 24.04 support and drop 22.04
- remove react native mobile app in favour of mobile optimized PWA

**Features**

- add Spanish, Tamil and Ukrainian as supported languages
- improve translations of datetimes
- rework group settings to just be a single page
- allow archiving of groups

## 0.14.0 (2024-08-16)

[Compare the full difference.](https://github.com/SFTtech/abrechnung/compare/v0.13.3...v0.14.0)

- fix non-interactible transaction position shares #209

## 0.13.3 (2024-03-02)

[Compare the full difference.](https://github.com/SFTtech/abrechnung/compare/v0.13.2...v0.13.3)

- web: add button to add a new purchase for an account from the account detail page

## 0.13.2 (2024-02-11)

[Compare the full difference.](https://github.com/SFTtech/abrechnung/compare/v0.13.1...v0.13.2)

- fix frontend docker container startup

## 0.13.1 (2024-02-04)

[Compare the full difference.](https://github.com/SFTtech/abrechnung/compare/v0.13.0...v0.13.1)

## 0.13.0 (2024-02-04)

[Compare the full difference.](https://github.com/SFTtech/abrechnung/compare/v0.12.1...v0.13.0)

- Add CSV exports for transactions in web by @ymeiron
- Add german translations
- Add multi-arch docker builds

## 0.12.1 (2024-01-05)

[Compare the full difference.](https://github.com/SFTtech/abrechnung/compare/v0.12.0...v0.12.1)

### Fixed

- Correctly filter out deleted transactions in balance computations
