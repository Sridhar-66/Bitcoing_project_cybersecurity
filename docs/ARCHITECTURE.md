# Architecture

## Core flow

Wallet -> React -> API -> Blockchain adapter -> Tracing -> Attribution -> Risk -> Evidence hash -> optional Solana program commitment.

## Identity

No login/signup. A connected wallet public key can be used as the application identity. Sensitive blockchain writes should be signed by the wallet.

## Attribution

The included VASP registry is synthetic demo data. Real attribution requires an authorized, verified intelligence source.

## Evidence

Store a cryptographic hash on-chain rather than putting large reports or transaction datasets on-chain.
