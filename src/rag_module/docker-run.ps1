Get-Content .env | Where-Object { $_ -match '^[^#].+=.+' } | ForEach-Object {
    $k, $v = $_ -split '=', 2
    [System.Environment]::SetEnvironmentVariable($k.Trim(), $v.Trim())
}

docker run -d `
  --name rag_module `
  -p 8002:8002 `
  -v "$($env:HF_CACHE_PATH):/root/.cache/huggingface/hub" `
  -v "$($env:CHROMADB_HOST_PATH):/app/src/chromadb" `
  --env-file .env `
  -e CHROMA_PATH=/app/src/chromadb `
  -e PDF_PARSER_URL=http://host.docker.internal:8001 `
  rag_module:latest