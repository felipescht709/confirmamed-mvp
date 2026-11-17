# gerar_codigo.ps1
# Script de AUDITORIA e Geracao de Codigo de Pareamento (Self-Healing)

$EVOLUTION_URL = "http://localhost:8085"
$API_KEY = "admin123"
$NEW_INSTANCE = "clinica_1"
$PHONE_NUMBER = "5549988495029" 
$headers = @{ "apikey" = $API_KEY; "Content-Type" = "application/json" }

Write-Host "--- NO DE AUDITORIA ---"

# 1. Verificar se a instancia ja existe
Write-Host "Buscando instancia $NEW_INSTANCE..."
$instanceExists = $false
try {
    $responseRoot = Invoke-RestMethod -Uri "$EVOLUTION_URL/instance/fetchInstances" -Headers $headers -Method Get
    if ($responseRoot.instances) {
        foreach ($inst in $responseRoot.instances) {
            if ($inst.instanceName -eq $NEW_INSTANCE) {
                $instanceExists = $true
                Write-Host "Instancia ja existe."
            }
        }
    }
} catch {
    Write-Host "Erro ao conectar na API."
    exit
}

# 2. Criar apenas se nao existir
if (-not $instanceExists) {
    Write-Host "Criando nova instancia $NEW_INSTANCE..."
    $body = @{ instanceName = $NEW_INSTANCE; qrcode = $true; integration = "WHATSAPP-BAILEYS" } | ConvertTo-Json
    try {
        Invoke-RestMethod -Uri "$EVOLUTION_URL/instance/create" -Headers $headers -Method Post -Body $body
        Write-Host "Instancia criada."
    } catch {
        Write-Host "Aviso na criacao."
    }
}

Write-Host "Aguardando motor 10 segundos..."
Start-Sleep -Seconds 10

# 3. Solicitar Pareamento
for ($i = 1; $i -le 5; $i++) {
    Write-Host "Tentativa $i para $PHONE_NUMBER..."
    $connectUrl = "${EVOLUTION_URL}/instance/connect/${NEW_INSTANCE}?number=${PHONE_NUMBER}"
    try {
        $response = Invoke-RestMethod -Uri $connectUrl -Headers $headers -Method Get
        if ($response.code) {
            Write-Host "SUCESSO"
            Write-Host "CODIGO: $($response.code)"
            exit
        } else {
            Write-Host "Aguardando..."
        }
    } catch {
        Write-Host "Erro na conexao."
    }
    Start-Sleep -Seconds 5
}

Write-Host "Fim do script."
