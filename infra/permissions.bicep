targetScope = 'resourceGroup'

param registryName string = 'acrcorporateopsawakann'
param environmentName string = 'cae-corporate-web-ops'
param appName string = 'ca-corporate-web-ops'
param pullIdentityName string = 'id-corporate-web-ops'
param deployIdentityName string = 'id-corporate-web-ops-deploy'

resource registry 'Microsoft.ContainerRegistry/registries@2025-11-01' existing = {
  name: registryName
}

resource environment 'Microsoft.App/managedEnvironments@2025-01-01' existing = {
  name: environmentName
}

resource app 'Microsoft.App/containerApps@2025-01-01' existing = {
  name: appName
}

resource pullIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' existing = {
  name: pullIdentityName
}

resource deployIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' existing = {
  name: deployIdentityName
}

var acrPullRole = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d')
var acrPushRole = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '8311e382-0749-4cb8-b61a-304f252e45ec')
var containerAppsContributorRole = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '358470bc-b998-42bd-ab17-a7e34c199c0f')
var managedIdentityOperatorRole = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'f1a07417-d97a-45cb-824c-7a7467783830')

resource registryPull 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: '6aba5e43-e455-42ef-8bd3-f4b29eafd317'
  scope: registry
  properties: {
    roleDefinitionId: acrPullRole
    principalId: pullIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

resource registryPush 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: '7c75dcfe-ef1f-4da9-9ae0-89fce9114d93'
  scope: registry
  properties: {
    roleDefinitionId: acrPushRole
    principalId: deployIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

resource appDeploy 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: 'c4ba7fc4-a507-4e78-b62e-ee9a4ac6923d'
  scope: app
  properties: {
    roleDefinitionId: containerAppsContributorRole
    principalId: deployIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

resource environmentJoin 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: '22a225b9-b26e-4c86-be99-cb00a421a84a'
  scope: environment
  properties: {
    roleDefinitionId: containerAppsContributorRole
    principalId: deployIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

resource assignPullIdentity 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: '9f029cf3-38fd-412f-b92f-6ad4ee6e3791'
  scope: pullIdentity
  properties: {
    roleDefinitionId: managedIdentityOperatorRole
    principalId: deployIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}
