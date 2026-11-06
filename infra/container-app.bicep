targetScope = 'resourceGroup'

param location string = 'eastus'
param appName string = 'ca-corporate-web-ops'
param environmentName string = 'cae-corporate-web-ops'
param registryName string = 'acrcorporateopsawakann'
param pullIdentityName string = 'id-corporate-web-ops'

@description('Git commit SHA used to tag both container images.')
param imageTag string

@description('Public HTTPS origin, without a trailing slash.')
param appOrigin string

@secure()
param mongodbUri string

@secure()
param sessionSecret string

resource environment 'Microsoft.App/managedEnvironments@2025-01-01' existing = {
  name: environmentName
}

resource registry 'Microsoft.ContainerRegistry/registries@2025-11-01' existing = {
  name: registryName
}

resource pullIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' existing = {
  name: pullIdentityName
}

var registryServer = registry.properties.loginServer
var containerResources = {
  cpu: json('0.25')
  memory: '0.5Gi'
}

resource app 'Microsoft.App/containerApps@2025-01-01' = {
  name: appName
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${pullIdentity.id}': {}
    }
  }
  properties: {
    environmentId: environment.id
    workloadProfileName: 'Consumption'
    configuration: {
      activeRevisionsMode: 'Single'
      maxInactiveRevisions: 100
      ingress: {
        external: true
        allowInsecure: false
        targetPort: 8080
        transport: 'auto'
        traffic: [
          {
            latestRevision: true
            weight: 100
          }
        ]
        exposedPort: 0
      }
      registries: [
        {
          server: registryServer
          identity: pullIdentity.id
        }
      ]
      secrets: [
        {
          name: 'mongodb-uri'
          value: mongodbUri
        }
        {
          name: 'session-secret'
          value: sessionSecret
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'web'
          image: '${registryServer}/cms-web:${imageTag}'
          resources: containerResources
        }
        {
          name: 'api'
          image: '${registryServer}/cms-api:${imageTag}'
          resources: containerResources
          env: [
            { name: 'PORT', value: '5000' }
            { name: 'NODE_ENV', value: 'production' }
            { name: 'TRUST_PROXY_HOPS', value: '2' }
            { name: 'APP_ORIGINS', value: appOrigin }
            { name: 'MONGODB_URI', secretRef: 'mongodb-uri' }
            { name: 'SESSION_SECRET', secretRef: 'session-secret' }
          ]
          probes: [
            {
              type: 'Readiness'
              httpGet: {
                path: '/api/health'
                port: 5000
              }
              periodSeconds: 10
              timeoutSeconds: 3
              failureThreshold: 3
            }
            {
              type: 'Startup'
              httpGet: {
                path: '/api/health'
                port: 5000
              }
              periodSeconds: 10
              timeoutSeconds: 3
              failureThreshold: 30
            }
          ]
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 1
        cooldownPeriod: 300
        pollingInterval: 30
      }
    }
  }
}
