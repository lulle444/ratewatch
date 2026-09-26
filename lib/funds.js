// Who can hold each tokenized T-bill fund, from the issuers' own documents (offering documents, factsheets, docs and
// regulator filings). Keyed by the token's upper-case symbol and shown under "Who can hold it" on the fund's page.
// "not stated" means the issuer's pages we could read don't say, and the page leaves that line out.
// Check the terms again when CHECKED is a few months old.
module.exports = {
  // tokens that are another form of the same fund
  ALIAS: {RUSDY: "USDY", ROUSG: "OUSG", IBENJI: "BENJI", FOBXX: "BENJI", TBL: "TBILL"},
  // pools that feed a fund and name it in DefiLlama's note
  BY_META: [[/janus henderson/i, "JTRSY"], [/^mtbill$/i, "MTBILL"]],
  CHECKED: "2026-09-26",
  // The same terms cut down to a line each for the /funds comparison table. us: "yes" (open to US retail),
  // "limited" (only accredited or qualified investors), "no". min is in dollars, for filtering.
  SHORT: {
    BUIDL: {buyers: "Qualified purchasers", us: "limited", usText: "Qualified purchasers only", min: 5e6, minText: "$5M", out: "USDC 24/7 through Circle’s swap", fee: "Not stated"},
    USDY: {buyers: "Non-US investors, after KYC", us: "no", usText: "No", min: 500, minText: "$500", out: "USDC or wire, within 5 business days", fee: "None; Ondo keeps a spread"},
    OUSG: {buyers: "Accredited and qualified purchasers", us: "limited", usText: "Qualified purchasers only", min: 5000, minText: "$5,000", out: "USDC 24/7, instant within limits", fee: "0.15%, waived until 2027"},
    USYC: {buyers: "Non-US companies", us: "no", usText: "No", min: 1e5, minText: "$100,000", out: "USDC 24/7, near-instant", fee: "10% of the yield"},
    USTB: {buyers: "Accredited and qualified purchasers", us: "limited", usText: "Qualified purchasers only", min: 1e5, minText: "$100,000", out: "USDC at once, weekends too", fee: "Up to 0.15%"},
    BENJI: {buyers: "Anyone, through the Benji app (KYC)", us: "yes", usText: "Yes", min: 20, minText: "$20", out: "Business days, cash within 7 days", fee: "0.20% (capped)"},
    TBILL: {buyers: "Professional or accredited investors", us: "limited", usText: "Accredited investors only", min: 1e5, minText: "$100,000", out: "USDC, usually next business day", fee: "0.35% + 0.05% per trade"},
    WTGXX: {buyers: "Anyone, through WisdomTree Prime (KYC)", us: "yes", usText: "Yes", min: 1, minText: "$1", out: "Same business day", fee: "0.25%"},
    JTRSY: {buyers: "Non-US professional investors", us: "no", usText: "No", min: 5e5, minText: "$500,000", out: "USDC, usually next day", fee: "0.15% + fund costs"},
    VBILL: {buyers: "Qualified purchasers", us: "limited", usText: "Qualified purchasers only", min: 1e5, minText: "$100,000 ($1M on Ethereum)", out: "USDC swaps 24/7 (per launch)", fee: "Not stated"},
    MTBILL: {buyers: "Non-US investors, after KYC", us: "no", usText: "No", min: 1, minText: "$1", out: "Any time after KYC, 0.07% fee", fee: "10% of the interest"},
    USTBL: {buyers: "Non-US investors incl. retail (KYC)", us: "no", usText: "No", min: 1, minText: "$1", out: "Same day (Paris cut-off)", fee: "0.25%"},
    STBT: {buyers: "Accredited investors (KYC, whitelisted)", us: "limited", usText: "Accredited investors only", min: Infinity, minText: "Not stated", out: "T+2, or same day up to a $1M daily limit", fee: "0.35% custody; no redemption fee"},
  },
  FUNDS: {
    STBT: {
      name: "Matrixdock Short-term Treasury Bill Token",
      issuer: "Matrixdock, part of BIT Group (formerly Matrixport); the issuer is owned by a purpose trust so it stays apart from the group if the group fails",
      what: "A token backed by short-term US T-bills and reverse repos, with some cash",
      who: "Only whitelisted people and companies that pass KYC and an accredited investor check can mint, hold, move or redeem it",
      us: "not stated",
      minimum: "not stated",
      redeem: "Through the Matrixdock web app, the BIT app or OTC: usually T+2 New York banking days, or same day within a $1M daily limit for everyone",
      transfer: "Only between whitelisted wallets; whitelisted wallets can also swap it in a Curve pool",
      yield: "Paid daily as new STBT tokens (a rebase)",
      fee: "0.35% a year for the third-party custodian; service and redemption fees waived",
      sources: [
        "https://www.matrixdock.com/stbt",
        "https://matrixdock.gitbook.io/matrixdock-docs/english/treasury-bill-token-stbt/token-features",
        "https://matrixdock.gitbook.io/matrixdock-docs/english/treasury-bill-token-stbt/faq",
      ],
    },
    BUIDL: {
      name: "BlackRock USD Institutional Digital Liquidity Fund",
      issuer: "BlackRock USD Institutional Digital Liquidity Fund Ltd., BVI professional fund (BVI FSC); Securitize is transfer agent",
      what: "Fund shares (1 token = 1 share, targets $1); holds cash, US T-bills and repos",
      who: "Qualified purchasers only (Rule 506(c) + ICA 3(c)(7)); onboarding/KYC via Securitize",
      us: "only qualified purchasers",
      minimum: "$5,000,000 initial",
      redeem: "Redeem to fund via Securitize (timing not stated); Circle smart contract swaps BUIDL for USDC near-instantly 24/7",
      transfer: "24/7 but only to other pre-approved (whitelisted) investors; no lockup stated",
      yield: "Daily-accrued dividends paid monthly as new BUIDL tokens to the wallet",
      fee: "not stated",
      sources: [
        "https://investors.securitize.io/news/news-details/2024/BlackRock-Launches-Its-First-Tokenized-Fund-BUIDL-on-the-Ethereum-Network-03-20-2024/default.aspx",
        "https://www.bvifsc.vg/regulated-entities/blackrock-usd-institutional-digital-liquidity-fund-ltd",
        "https://www.circle.com/pressroom/circle-announces-usdc-smart-contract-for-transfers-by-blackrocks-buidl-fund-investors"
      ]
    },
    USDY: {
      name: "Ondo US Dollar Yield (USDY) / rebasing rUSDY",
      issuer: "Ondo Global Markets (BVI) Limited, BVI (formerly Ondo USDY LLC; folded into Ondo Global Markets/Ondo Stocks 15 Dec 2025)",
      what: "Tokenized note (not a fund share) secured by short-term Treasuries, iShares short-Treasury ETF shares or bank deposits",
      who: "Non-US individuals and institutions after KYC; professional/qualified-investor tests in UK, EEA, CH, SG, HK, BR, MY; Canada etc. barred",
      us: "no (US persons may not subscribe, acquire or redeem)",
      minimum: "$500 to invest/redeem ($5,000 on Sui/Aptos/Stellar/XRP/Noble/Tempo; $100k for bank wire)",
      redeem: "Wire to non-US bank or USDC; processed within 5 business days (usually 1-2 days after next business day); 20 bps fee + $30 wire <$100k",
      transfer: "40-50 day restricted period (you hold a Temporary Global Certificate); after that tokens freely transferable except sanctioned addresses",
      yield: "USDY: price rises daily at a monthly-set rate; rUSDY: $1 price, balance rebases daily; convertible 1:1 in value",
      fee: "No management fee; Ondo keeps the spread between earned yield and the rate it sets",
      sources: [
        "https://docs.ondo.finance/general-access-products/usdy/faq/eligibility",
        "https://docs.ondo.finance/general-access-products/usdy/faq/investing-and-redeeming",
        "https://docs.ondo.finance/general-access-products/usdy/faq/economics-and-fees"
      ]
    },
    OUSG: {
      name: "Ondo Short-Term US Government Treasuries (OUSG) / rebasing rOUSG",
      issuer: "Ondo I LP, Delaware limited partnership (not registered under the 1940 Act)",
      what: "LP interests in a fund holding short-term Treasury/GSE exposure mainly via tokenized MMFs/ETFs (BUIDL, BENJI, WTGXX etc.), deposits, USDC",
      who: "Must be BOTH accredited investor AND qualified purchaser; US and non-US in eligible countries; KYC onboarding required",
      us: "only qualified purchasers (who are also accredited)",
      minimum: "$5,000 instant mint/redeem; $100,000 subscribe / $50,000 redeem for non-instant",
      redeem: "Instant 24/7 in USDC at NAV within daily limits; non-instant USD daily at next NAV; site says 0% mint/redeem fee",
      transfer: "Only between wallets of investors already onboarded to Ondo Qualified Access funds (whitelisted); no lockup stated",
      yield: "OUSG: token price rises; rOUSG: ~$1 price, balance rebases",
      fee: "0.15% management fee waived until 1 Jan 2027; fund expenses capped at 0.15%",
      sources: [
        "https://docs.ondo.finance/qualified-access-products/eligibility",
        "https://docs.ondo.finance/qualified-access-products/ousg/overview",
        "https://ondo.finance/ousg"
      ]
    },
    USYC: {
      name: "Circle USYC (formerly Hashnote)",
      issuer: "Hashnote International Short Duration (Yield) Fund Ltd., Cayman mutual fund (CIMA); Circle International Bermuda Ltd. (BMA) administers token",
      what: "Tokenized fund shares; fund holds reverse repo on US government securities and short-term Treasuries",
      who: "Non-US persons (Reg S) only; developer docs say entities only; KYC/KYB onboarding with Circle",
      us: "no",
      minimum: "$100,000",
      redeem: "USDC 24/7; near-instant up to instant capacity, larger T+0/T+1; 0.03% redeem / 0.04% subscribe, waived on first $1M daily",
      transfer: "Permissioned: only allowlisted, onboarded wallets; no lockup stated",
      yield: "Rising token price (NAV via on-chain oracle); no distributions",
      fee: "10% of yield generated",
      sources: [
        "https://www.circle.com/usyc",
        "https://developers.circle.com/tokenized/usyc/overview",
        "https://www.circle.com/blog/circle-usyc-is-now-available-on-bnb-chain"
      ]
    },
    USTB: {
      name: "Invesco Short Duration US Government Securities Fund (USTB), formerly Superstate's fund",
      issuer: "Series of a Delaware statutory trust; adviser now Invesco Advisers, Inc.; Superstate Services LLC is transfer agent",
      what: "Fund shares (3(c)(7) private fund) investing in short-duration US Treasury bills",
      who: "Accredited Investors and Qualified Purchasers; site aimed at US residents; KYC + wallet allowlist",
      us: "only qualified purchasers",
      minimum: "$100,000 initial unless waived by Superstate",
      redeem: "USDC paid immediately incl. weekends (subject to liquidity); USD same day if before 1pm ET; investor pays gas/wire fees",
      transfer: "Freely transferable between allowlisted addresses; transfers need consent/smart-contract controls; no lockup stated",
      yield: "Continuously rising NAV per share; no distributions",
      fee: "<=0.15% management fee; monthly rebates for average holdings >$25M",
      sources: [
        "https://superstate.com/assets/ustb",
        "https://docs.superstate.com/investors/tokenized-funds/available-funds/invesco-ustb",
        "https://docs.superstate.com/investors/tokenized-funds/redeem"
      ]
    },
    BENJI: {
      name: "Franklin OnChain U.S. Government Money Fund (FOBXX), token BENJI",
      issuer: "Series of Franklin Templeton Trust, US; SEC-registered 1940 Act fund; Franklin Templeton is its own transfer agent",
      what: "Registered government money market fund shares (1 BENJI = 1 share); >=99.5% govt securities, cash, govt-backed repo",
      who: "Retail via Benji app, institutions via Benji Institutional portal; KYC; fund 'intended for sale to residents of the United States'",
      us: "yes (retail allowed; aimed at US residents)",
      minimum: "$20 initial for most accounts; no minimum after",
      redeem: "Via app/portal, processed business days only; proceeds by EFT within 7 days (ACH usually 2-3 business days)",
      transfer: "Peer-to-peer only to active, whitelisted wallets registered with the transfer agent; no lockup",
      yield: "Dividends declared daily, reinvested as new shares (BENJI tokens airdropped to wallet)",
      fee: "0.15% management; total 0.22% gross, capped at 0.20% until 31 Jul 2027",
      sources: [
        "https://www.franklintempleton.com/forms-literature/download-preview/9001-PSUM",
        "https://www.sec.gov/Archives/edgar/data/1786958/000174177324002831/c497.htm",
        "https://digitalassets.franklintempleton.com/benji/"
      ]
    },
    TBILL: {
      name: "OpenEden TBILL",
      issuer: "TBILL Fund, BVI registered professional fund (SIBA 2010), regulated by BVI FSC; manager BNY Mellon IM Singapore",
      what: "Token representing investor's economic interest in the fund; backed by short-dated US T-bills plus some USD",
      who: "BVI 'Professional Investors' or US Reg D accredited investors; KYC/KYT and wallet whitelisting required",
      us: "only accredited investors",
      minimum: "100,000 USDC initial; 1 USDC after",
      redeem: "In USDC, typically next US business day (T+1); min 1 USDC; 5 bps transaction fee",
      transfer: "Only to other whitelisted investors; no lockup stated",
      yield: "Rising token price (NAV) as T-bills accrete to par",
      fee: "0.35% p.a. expense ratio per fees page (FAQ still says 0.30%) + 5 bps on subscriptions/redemptions",
      sources: [
        "https://docs.openeden.com/tbill/introduction.md",
        "https://docs.openeden.com/tbill/investor-onboarding.md",
        "https://docs.openeden.com/tbill/fees"
      ]
    },
    WTGXX: {
      name: "WisdomTree Treasury Money Market Digital Fund (WTGXX)",
      issuer: "WisdomTree fund, US; SEC-registered 1940 Act Rule 2a-7 money market fund (trust name not stated on pages read)",
      what: "Registered MMF shares, stable $1 NAV; holds Treasury bills/notes and Treasury-backed repo",
      who: "Retail via WisdomTree Prime, institutions via WisdomTree Connect; wallets must pass KYC/AML and be whitelisted",
      us: "yes (Prime page: US investors only)",
      minimum: "$1",
      redeem: "Primary T+0 on business days, 3:30pm ET cut-off, no commission; USD or USDC/PYUSD for institutions; 24/7 instant secondary",
      transfer: "Peer-to-peer only between verified, whitelisted wallets; no lockup stated",
      yield: "Income accrues daily, paid monthly in cash, stablecoin or reinvested shares",
      fee: "0.25% net expense ratio",
      sources: [
        "https://dataspanapi.wisdomtree.com/pdr/documents/WEBSITE_FUND_DETAILS/WDT/US/EN-US/WTGXX_3/",
        "https://www.wisdomtree.com/-/media/us-media-files/documents/resource-library/fund-fact-sheets/digital/wtgxx.pdf",
        "https://www.wisdomtreeprime.com/digital-funds/wtgxx/"
      ]
    },
    JTRSY: {
      name: "Janus Henderson Anemoy Treasury Fund (JTRSY)",
      issuer: "Anemoy Capital SPC Ltd., BVI licensed professional fund; manager Anemoy AM, sub-manager Janus Henderson",
      what: "Tokenized fund shares (Centrifuge); holds 0-3 month US Treasury bills",
      who: "Non-US Professional Investors only; KYC required",
      us: "no",
      minimum: "$500,000 in USDC",
      redeem: "Daily in USDC, usually T+1",
      transfer: "not stated in fund doc; Centrifuge also offers a deJTRSY wrapper described as freely transferable",
      yield: "Accrues in token NAV/price (no distribution mechanism stated)",
      fee: "0.15% management + pass-through custody/admin/audit costs (per Feb 2025 fund doc)",
      sources: [
        "https://ipfs.centrifuge.io/ipfs/QmXS7nrNDE131Ptr9wQ1gxLkL3fWwkCaNqKB1ZtR4hz3gV",
        "https://www.anemoy.io/funds/jtrsy",
        "https://centrifuge.io/blog/centrifuge-derwa-tokens"
      ]
    },
    VBILL: {
      name: "VanEck Treasury Fund (VBILL)",
      issuer: "VanEck Treasury Fund, Ltd., British Virgin Islands; tokenized by Securitize; not a 1940 Act registered fund",
      what: "Fund shares; holds US Treasury obligations and Treasury-backed repos",
      who: "Qualified Purchasers only; onboarding via Securitize",
      us: "only qualified purchasers",
      minimum: "$100,000 on Avalanche/BNB/Solana; $1,000,000 on Ethereum",
      redeem: "Launch release cites 24/7 liquidity, real-time settlement and USDC/AUSD swaps; formal redemption timing not stated",
      transfer: "not stated",
      yield: "not stated",
      fee: "not stated",
      sources: [
        "https://www.prnewswire.com/news-releases/vaneck-launches-first-tokenized-fund-vbill-on-securitize-302453863.html"
      ]
    },
    MTBILL: {
      name: "Midas mTBILL",
      issuer: "Midas Software GmbH, Berlin, Germany; EU base prospectus approved by Liechtenstein FMA (renewed Jul 2025)",
      what: "Tokenized debt instrument (certificate) under German law tracking 8-week US T-bill return minus 50 bps tracking error",
      who: "Anyone passing Midas KYC to mint/redeem; public offer passported to listed EEA states; no pro-only limit found in final terms",
      us: "no (not offered to US persons)",
      minimum: "USD 1 (Oct 2024 final terms)",
      redeem: "Holders who pass KYC can redeem any time; timing not stated; 0.07% redemption fee + 10% interest fee",
      transfer: "Freely transferable (OTC/bilateral); holding needs no KYC, only mint/redeem",
      yield: "Rising token price as underlying T-bill return accumulates",
      fee: "No separate management fee; costs via 10% of interest + 0.07% redemption fee + 50 bps tracking error",
      sources: [
        "https://www.mfsa.mt/wp-content/uploads/2024/11/Midas-Software-GmbH-Final-Terms-Document-dated-7-October-2024.pdf",
        "https://www.mfsa.mt/wp-content/uploads/2024/11/Midas-Software-GmbH-Base-Prospectus-Document-dated-17-July-2024.pdf",
        "https://www.mfsa.mt/wp-content/uploads/2026/05/Midas-Software-GmbH-Final-Terms-Document-dated-16-April-2026-REF-mRe7ETH.pdf"
      ]
    },
    USTBL: {
      name: "Spiko US T-Bills Money Market Fund (USTBL)",
      issuer: "Sub-fund of Spiko SICAV, France; UCITS money market fund approved by AMF; depositary CACEIS",
      what: "UCITS MMF shares recorded on-chain (1 token = 1 share); holds short-term US Treasury bills",
      who: "'All investors' incl. retail individuals and companies (non-US); KYC; wallet must be allowlisted before subscribing",
      us: "no (not offered to US Persons)",
      minimum: "$1 initial and subsequent",
      redeem: "Orders by 11:30am Paris get same-day NAV, settled same day (D); no redemption fee stated",
      transfer: "Only between allowlisted addresses validated by the management company; no lockup",
      yield: "Accumulating: income reinvested, share price rises",
      fee: "0.25% management fee (prospectus max 0.30% + up to 0.10% operating costs)",
      sources: [
        "https://www.spiko.io/spiko-treasury-bills-dollar",
        "https://cdn.spiko.finance/legal_docs/EN/Prospectus_Spiko_SICAV_EN.pdf"
      ]
    }
  }
};
