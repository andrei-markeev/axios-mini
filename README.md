## axios-mini

Minimalistic Axios-like HTTP client with zero dependencies.

### Installation

```
npm i @andrei-markeev/axios-mini
```

### Usage

```ts

import axios from "@andrei-markeev/axios-mini"

const response = await axios.get("https://google.com");
if (response.status >= 400)
    console.error("Error!", response);

```

**Note**: Unlike axios, axios-mini doesn't throw error in case of errorous response code.
