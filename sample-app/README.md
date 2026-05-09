# Výpůjčky

Kolaborativní local-first aplikace pro evidenci výpůjček laboratorního vybavení na univerzitě.

## Popis funkcionality

Správce laboratoře založí v aplikaci novou místnost a získá klíč pro sdílení (mnemonic). Ten předá oprávněným uživatelům buď pomocí ručního přepsání (odesláním přes bezpečný kanál), vyfocením QR kódu, nebo skrze audio. Kdo má klíč, vidí seznam vybavení dané místnosti a může zaznamenat půjčku nebo vrácení. Data se šifrují end-to-end a synchronizují přes relay server. Aplikace funguje i bez internetu — změny se synchronizují při obnovení připojení.

## Příkazy

```sh
pnpm install
pnpm dev
pnpm build
pnpm test:unit
pnpm test:e2e
pnpm verify
```
