targetScope = 'resourceGroup'

param location string = 'eastus'
param deployIdentityName string = 'id-corporate-web-ops-deploy'

@description('Exact subject claim emitted by GitHub Actions for the production environment.')
param githubSubject string = 'repo:Awakann@205203444/corporate-web-ops@1442207066:environment:production'

resource deployIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: deployIdentityName
  location: location
}

resource githubTrust 'Microsoft.ManagedIdentity/userAssignedIdentities/federatedIdentityCredentials@2023-01-31' = {
  parent: deployIdentity
  name: 'github-production'
  properties: {
    issuer: 'https://token.actions.githubusercontent.com'
    subject: githubSubject
    audiences: [
      'api://AzureADTokenExchange'
    ]
  }
}
