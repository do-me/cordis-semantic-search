# CORDIS semantic search

### Intro
A basic semantic search app based on 133.952 public pdfs (~2TB) from [CORDIS](https://cordis.europa.eu/search/en) chunked and indexed (mean embedding of all chunks) in a ~38MB gzipped json with [all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2).
App loads ~50Mb of resources of data and scripts. Data cutoff in 2022.

### Architecture 
The app loads a gzipped json with a filename referring to the downloaded pdf files from CORDIS and the vectors consisting of 384 dimensions: 

|| filename| mean_embedding |
|-:|:-|:-|
|  0 | project_rcn_229984_projectDeliverable_webLinkId_c314060ff50aa63cf69787e20ae3776e.pdf | [-0.02,..., -0.03]     |
|  1 | project_rcn_211323_projectDeliverable_webLinkId_973e210a8393dd1e82ab26ae5f1fcc55.pdf | [0.02, ..., 0.0]     |
|  2 | project_rcn_211567_projectDeliverable_webLinkId_92ee89e81e18ca78c510f7d3a41a0cef.pdf | [-0.04, ..., -0.02]   |
|  3 | project_rcn_206371_projectDeliverable_webLinkId_18c997f51b451d2653e5b4e821ce2b8f.pdf | [-0.04,..., 0.02]             |
|  4 | project_rcn_229098_projectDeliverable_webLinkId_e67766b20e28a7215683a66666933a64.pdf | [0.01,..., 0.02] |

- The static web app parses the filename and translates it to URLs where possible.
- The floats in the vector are trimmed to 2 decimals based on empiric trials. The search is not intended to deliver accurately ranked results but rather return the most related ones, e.g. top 20 which works pretty well. The same file with 3 decimal places per float would have ~80MB while the one with all decimal places (default precision with sentence transformers) would lead to a file with 1.2GB which isn't feasible for a static web app. An alternative approach with product quantization is beeing explored.
- Uses indexDB to cache the ~38MB gzipped json in the browser, so consecutive site calls are fast. 

### Packages used 
- [transformers.js](https://github.com/xenova/transformers.js) for in-browser inferencing of the user-query
- [pako.js](https://github.com/nodeca/pako) for decompressing the gzipped json
- [bootstrap](https://getbootstrap.com/) for basic styling

### Data inspection 
If you'd like to inspect the data pandas offers automatic decompression:

```python
import pandas as pd 
df = pd.read_json("filename_mean_embedding_prec_2_records.json.gz")
df
```
