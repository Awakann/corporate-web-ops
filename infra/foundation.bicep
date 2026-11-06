targetScope = 'resourceGroup'

@description('Azure region for the CMS resources.')
param location string = 'eastus'

@description('Globally unique container registry name.')
param registryName string = 'acrcorporateopsawakann'

param environmentName string = 'cae-corporate-web-ops'
param pullIdentityName string = 'id-corporate-web-ops'

resource registry 'Microsoft.ContainerRegistry/registries@2025-11-01' = {
  name: registryName
  location: location
  sku: {
    name: 'Standard'
  }
  properties: {
    adminUserEnabled: false
    anonymousPullEnabled: false
    publicNetworkAccess: 'Enabled'
    roleAssignmentMode: 'LegacyRegistryPermissions'
    dataEndpointEnabled: false
    encryption: {
      status: 'disabled'
}
networkRuleBypassAllowedForTasks: false
  }
}

resource environment 'Microsoft.App/managedEnvironments@2025-01-01' = {
  name: environmentName
  location: location
  properties: {
    zoneRedundant: false
    appLogsConfiguration: {
      destination: ''
    }
    workloadProfiles: [
      {
        name: 'Consumption'
        workloadProfileType: 'Consumption'
      }
    ]
    peerAuthentication: {
      mtls: {
         enabled: false
  }
}
    peerTrafficConfiguration: {
      encryption: {
        enabled: false
  }
}
  }
}

resource pullIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: pullIdentityName
  location: location
}

output registryId string = registry.id
output registryLoginServer string = registry.properties.loginServer
output environmentId string = environment.id
output pullIdentityId string = pullIdentity.id
output pullIdentityPrincipalId string = pullIdentity.properties.principalId
