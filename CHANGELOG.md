# Changelog

## Unreleased

[Compare the full difference.](https://github.com/SFTtech/abrechnung/compare/v1.1.0...HEAD)

**Features**

- add transaction history display

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
