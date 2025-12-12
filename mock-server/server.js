const jsonServer = require('json-server');
const express = require('express');
const middleware = require('./middleware');
const server = jsonServer.create();
const router = jsonServer.router('./db.json');
const defaultMiddlewares = jsonServer.defaults();

server.use(defaultMiddlewares);
server.use(express.json());
server.use(middleware);
server.use(router);

const PORT = process.env.PORT || 3002;

server.listen(PORT, () => {
  console.log(`Mock Server running on http://localhost:${PORT}`);
  console.log('Participant API Endpoints  available:');
  console.log('  - GET    /v1/participants');
  console.log('  - GET    /v1/participants/:participantId');
  console.log('  - POST   /v1/participants');
  console.log('  - PATCH  /v1/participants/:participantId');
  console.log('  - DELETE /v1/participants/:participantId');
  console.log('  - GET    /v1/participants/:participantId/credentials');
  console.log('  - GET    /v1/participants/:participantId/credentials/:credentialId');
  console.log('  - POST   /v1/participants/:participantId/credentials');
  console.log('  - PUT    /v1/participants/:participantId/credentials');
  console.log('  - GET    /v1/participants/:participantId/operations');
  console.log('  - GET    /v1/participants/stats');
  console.log('');
  console.log('Sample data includes 5 participants with different statuses:');
  console.log('  - ACTIVE: customer0122, customer03');
  console.log('  - PROVISION_IN_PROGRESS: customer02');
  console.log('  - PROVISION_FAILED: customer04');
  console.log('  - DEPROVISION_IN_PROGRESS: customer05');
});
