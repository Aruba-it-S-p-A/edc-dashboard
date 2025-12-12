const fs = require('fs');
const path = require('path');

function getDb() {
  const dbPath = path.join(__dirname, 'db.json');
  return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
}

function saveDb(data) {
  const dbPath = path.join(__dirname, 'db.json');
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function generateDid(name) {
  return `did:web:${name}.example.com`;
}

function generateHost() {
  const hosts = ['k8s-cluster-01.example.com', 'k8s-cluster-02.example.com'];
  return hosts[Math.floor(Math.random() * hosts.length)];
}

module.exports = (req, res, next) => {
  const db = getDb();

  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Expose-Headers', 'X-Total, X-Page, X-Limit');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Middleware - Processing request for path:', req.path);

  if (req.method === 'GET' && req.path === '/v1/participants') {
    let participants = [...db.participants];

    if (req.query.status) {
      participants = participants.filter(p => p.status === req.query.status);
    }

    if (req.query.search) {
      const searchTerm = req.query.search.toLowerCase();
      participants = participants.filter(p =>
        p.name.toLowerCase().includes(searchTerm) ||
        p.did.toLowerCase().includes(searchTerm) ||
        p.host.toLowerCase().includes(searchTerm)
      );
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const paginatedParticipants = participants.slice(startIndex, endIndex);

    res.set({
      'X-Total': participants.length.toString(),
      'X-Page': page.toString(),
      'X-Limit': limit.toString()
    });

    return res.json(paginatedParticipants);
  }

  if (req.method === 'GET' && req.path.match(/^\/v1\/participants\/[^\/]+$/)) {
    console.log('Matched single participant route for path:', req.path);
    const participantId = req.path.split('/').pop();
    const participant = db.participants.find(p => p.id === participantId);

    if (!participant) {
      return res.status(404).json({
        error: 'Participant not found'
      });
    }

    return res.json(participant);
  }

  if (req.method === 'POST' && req.path === '/v1/participants') {
    let name, password, description, metadata, username, userMetadata;
    
    if (req.body.participant && req.body.user) {
      ({ name, description, metadata } = req.body.participant);
      ({ username, password, userMetadata } = req.body.user);
    } else {
      ({ name, password, description, metadata } = req.body);
    }

    if (!name) {
      return res.status(400).json({
        error: 'Missing required field: participant.name'
      });
    }

    if (!password) {
      return res.status(400).json({
        error: 'Missing required field: user.password'
      });
    }

    const nameRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
    if (!nameRegex.test(name)) {
      return res.status(400).json({
        error: 'Invalid name format. Must match pattern: ^[a-z0-9][a-z0-9-]*[a-z0-9]$'
      });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])(?!.*\s)[A-Za-z\d@$!%*?&]+$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        error: 'Invalid password format. Must contain at least one uppercase, one lowercase, one number and one special character. Spaces are not allowed.'
      });
    }

    const existingParticipant = db.participants.find(p => p.name === name);
    if (existingParticipant) {
      return res.status(409).json({
        error: `Participant with name '${name}' already exists`
      });
    }

    const now = new Date().toISOString();
    const newParticipant = {
      id: generateId(),
      name,
      did: generateDid(name),
      host: generateHost(),
      status: 'PROVISION_IN_PROGRESS',
      description: description || '',
      metadata: metadata || {},
      user: {
        username: username || 'admin',
        metadata: userMetadata || {}
      },
      provisioningStartedAt: now,
      lastOperationAt: now,
      createdAt: now,
      updatedAt: now
    };

    db.participants.push(newParticipant);
    saveDb(db);

    return res.status(201).json(newParticipant);
  }

  if (req.method === 'PATCH' && req.path.match(/^\/v1\/participants\/[^\/]+$/)) {
    const participantId = req.path.split('/').pop();
    const participantIndex = db.participants.findIndex(p => p.id === participantId);

    if (participantIndex === -1) {
      return res.status(404).json({
        error: 'Participant not found'
      });
    }

    const { name, description, metadata } = req.body;
    const now = new Date().toISOString();

    if (name && name !== db.participants[participantIndex].name) {
      const existingParticipant = db.participants.find(p => p.name === name && p.id !== participantId);
      if (existingParticipant) {
        return res.status(409).json({
          error: `Participant with name '${name}' already exists`
        });
      }
    }

    const updatedParticipant = {
      ...db.participants[participantIndex],
      ...(name && { name, did: generateDid(name) }),
      ...(description !== undefined && { description }),
      ...(metadata && { metadata }),
      updatedAt: now
    };

    db.participants[participantIndex] = updatedParticipant;
    saveDb(db);

    return res.json(updatedParticipant);
  }

  if (req.method === 'DELETE' && req.path.match(/^\/v1\/participants\/[^\/]+$/)) {
    const participantId = req.path.split('/').pop();
    const participantIndex = db.participants.findIndex(p => p.id === participantId);

    if (participantIndex === -1) {
      return res.status(404).json({
        error: 'Participant not found'
      });
    }

    db.participants.splice(participantIndex, 1);

    db.credentials = db.credentials.filter(c => c.participantId !== participantId);
    db.operations = db.operations.filter(o => o.participantId !== participantId);

    saveDb(db);

    return res.status(204).end();
  }

  if (req.method === 'GET' && req.path.match(/^\/v1\/participants\/[^\/]+\/credentials$/)) {
    console.log('=== CREDENTIALS ROUTE MATCHED ===');
    console.log('Matched credentials route for path:', req.path);
    const participantId = req.path.split('/')[4];
    console.log('Participant ID:', participantId);
    const participant = db.participants.find(p => p.id === participantId);
    console.log('Found participant:', participant ? 'YES' : 'NO');

    if (!participant) {
      return res.status(404).json({
        error: 'Participant not found'
      });
    }

    let credentials = db.credentials.filter(c => c.participantId === participantId);

    if (req.query.status) {
      credentials = credentials.filter(c => c.metadata?.status === req.query.status);
    }

    const transformedCredentials = credentials.map(cred => ({
      id: cred.id,
      requestId: cred.metadata?.requestId,
      credentialType: cred.type,
      format: cred.format,
      status: cred.metadata?.status || 'UNKNOWN',
      issuedAt: cred.metadata?.issuedAt,
      expiresAt: cred.metadata?.expiresAt,
      credentialHash: cred.metadata?.credentialHash,
      createdAt: cred.createdAt
    }));

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const paginatedCredentials = transformedCredentials.slice(startIndex, endIndex);

    res.set({
      'X-Total': transformedCredentials.length.toString(),
      'X-Page': page.toString(),
      'X-Limit': limit.toString()
    });

    return res.json(paginatedCredentials);
  }

  if (req.method === 'GET' && req.path.match(/^\/api\/v1\/participants\/[^\/]+\/credentials\/[^\/]+$/)) {
    const pathParts = req.path.split('/');
    const participantId = pathParts[4];
    const credentialId = pathParts[6];

    const participant = db.participants.find(p => p.id === participantId);
    if (!participant) {
      return res.status(404).json({
        error: 'Participant not found'
      });
    }

    const credential = db.credentials.find(c => c.id === credentialId && c.participantId === participantId);
    if (!credential) {
      return res.status(404).json({
        error: 'Credential not found'
      });
    }

    return res.json(credential);
  }

  if (req.method === 'POST' && req.path.match(/^\/v1\/participants\/[^\/]+\/credentials$/)) {
    const participantId = req.path.split('/')[4];
    const participant = db.participants.find(p => p.id === participantId);

    if (!participant) {
      return res.status(404).json({
        error: 'Participant not found'
      });
    }

    const { credentials } = req.body;

    if (!credentials || !Array.isArray(credentials) || credentials.length === 0) {
      return res.status(400).json({
        error: 'Missing or invalid credentials array'
      });
    }

    for (const cred of credentials) {
      if (!cred.format || !cred.type || !cred.id) {
        return res.status(400).json({
          error: 'Each credential must have format, type, and id'
        });
      }

      if (cred.format !== 'VC1_0_JWT') {
        return res.status(400).json({
          error: 'Only VC1_0_JWT format is supported'
        });
      }

      if (!['MembershipCredential', 'DataProcessorCredential'].includes(cred.type)) {
        return res.status(400).json({
          error: 'Invalid credential type. Must be MembershipCredential or DataProcessorCredential'
        });
      }
    }

    const requestId = `credential-request-${Date.now()}`;

    const createdCredentials = credentials.map((cred, index) => {
      const credentialId = `${participantId}-${cred.type.toLowerCase()}-${Date.now()}-${index}`;
      const newCredential = {
        id: credentialId,
        participantId: participantId,
        format: cred.format,
        type: cred.type,
        credentialId: credentialId,
        value: '', // Empty initially, will be filled when issued
        metadata: {
          requestId: requestId,
          status: 'REQUESTED',
          issuer: 'dataspace-issuer-service',
          subject: participant.name
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      db.credentials.push(newCredential);

      return {
        format: cred.format,
        type: cred.type,
        id: cred.id,
        status: 'REQUESTED'
      };
    });

    const response = {
      requestId: requestId,
      participantId: participantId,
      status: 'REQUESTED',
      credentials: createdCredentials
    };

    return res.status(201).json(response);
  }


  if (req.method === 'PUT' && req.path.match(/^\/v1\/participants\/[^\/]+\/credentials$/)) {
    const participantId = req.path.split('/')[4];
    const participant = db.participants.find(p => p.id === participantId);

    if (!participant) {
      return res.status(404).json({
        error: 'Participant not found'
      });
    }

    const { credentials } = req.body;

    if (!credentials || !Array.isArray(credentials) || credentials.length === 0) {
      return res.status(400).json({
        error: 'Missing or invalid credentials array'
      });
    }

    db.credentials = db.credentials.filter(c => c.participantId !== participantId);

    const now = new Date().toISOString();
    const newCredentials = credentials.map((cred, index) => ({
      id: `cred-${participantId}-${index}`,
      participantId,
      format: cred.format,
      type: cred.type,
      credentialId: cred.id,
      value: cred.value,
      metadata: cred.metadata || {},
      createdAt: now,
      updatedAt: now
    }));

    db.credentials.push(...newCredentials);
    saveDb(db);

    return res.json(newCredentials);
  }

  if (req.method === 'GET' && req.path.match(/^\/v1\/participants\/[^\/]+\/operations$/)) {
    const participantId = req.path.split('/')[4];
    const participant = db.participants.find(p => p.id === participantId);

    if (!participant) {
      return res.status(404).json({
        error: 'Participant not found'
      });
    }

    let operations = db.operations.filter(o => o.participantId === participantId);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const paginatedOperations = operations.slice(startIndex, endIndex);

    res.set({
      'X-Total': operations.length.toString(),
      'X-Page': page.toString(),
      'X-Limit': limit.toString()
    });

    return res.json(paginatedOperations);
  }

  if (req.method === 'GET' && req.path === '/v1/participants/stats') {
    const participants = db.participants;
    const stats = {
      total: participants.length,
      active: participants.filter(p => p.status === 'ACTIVE').length,
      provisioning: participants.filter(p => p.status === 'PROVISION_IN_PROGRESS').length,
      deprovisioning: participants.filter(p => p.status === 'DEPROVISION_IN_PROGRESS').length,
      failed: participants.filter(p => p.status === 'PROVISION_FAILED' || p.status === 'DEPROVISION_FAILED').length
    };

    return res.json(stats);
  }

  if (req.path === '/v1/tenants/me' && req.method === 'GET') {
    console.log('GET /v1/tenants/me - Returning tenant info with branding');
    
    const tenantInfo = {
      id: "519b0efa-9cc6-479d-8b1b-7586f835df40",
      name: "tech-solutions-srl",
      description: "Company specialized in DataSpace solutions for the manufacturing sector. We offer data integration services and advanced analytics to help companies make the most of their data.",
      metadata: {
        organizationName: "Tech Solutions S.r.l.",
        industry: "Technology",
        contactName: "Mario Rossi",
        email: "mario.rossi@techsolutions.it",
        phone: "+39 02 1234567",
        role: "CEO",
        region: "eu-west-1",
        environment: "production",
        createdAt: "2025-01-22T15:28:53.408Z",
        brand: {
          logo: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjZGYyNzI3Ii8+Cjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjZmZmZmZmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIj5UZWNoPC90ZXh0Pgo8L3N2Zz4=",
          logoType: "base64",
          cardColor: "#1f2937",
          sidenavColor: "#1f2937",
          headerColor: "#1f2937",
          textColor: "#f9fafb",
          backgroundColor: "#0f172a"
        }
      }
    };

    return res.json(tenantInfo);
  }

  if (req.path.startsWith('/v1/tenants/') && req.method === 'PUT') {
    const tenantId = req.path.split('/')[3];
    console.log(`PUT /v1/tenants/${tenantId} - Updating tenant branding`);
    
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const updateData = JSON.parse(body);
        console.log('Update data received:', updateData);
        
        const response = {
          success: true,
          message: 'Tenant branding updated successfully',
          tenantId: tenantId,
          updatedBranding: updateData.metadata?.brand || {}
        };
        
        res.json(response);
      } catch (error) {
        console.error('Error parsing request body:', error);
        res.status(400).json({
          success: false,
          message: 'Invalid request body',
          error: error.message
        });
      }
    });
    
    return;
  }

  next();
};
