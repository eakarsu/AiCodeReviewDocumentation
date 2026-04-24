import { initDatabase, query } from '../config/database.js';
import { hashPassword, generateToken } from '../utils/crypto.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const seedCodeReviews = async () => {
  const items = [
    { title: 'User Authentication Module', description: 'Review login/logout functionality', code_snippet: 'async function login(email, password) {\n  const user = await User.findOne({ email });\n  if (!user) throw new Error("User not found");\n  const valid = await bcrypt.compare(password, user.password);\n  return valid ? generateToken(user) : null;\n}', language: 'javascript', status: 'completed', review_result: 'Good implementation with proper async/await. Consider adding rate limiting.', severity_score: 6, issues_count: 2 },
    { title: 'Shopping Cart Logic', description: 'E-commerce cart operations review', code_snippet: 'class Cart {\n  addItem(product, qty) {\n    const existing = this.items.find(i => i.id === product.id);\n    if (existing) existing.qty += qty;\n    else this.items.push({ ...product, qty });\n  }\n}', language: 'javascript', status: 'pending' },
    { title: 'Database Query Optimization', description: 'Review SQL queries for performance', code_snippet: 'SELECT u.*, o.* FROM users u\nLEFT JOIN orders o ON u.id = o.user_id\nWHERE u.created_at > NOW() - INTERVAL 30 DAY;', language: 'sql', status: 'completed', review_result: 'Consider adding indexes on created_at and user_id columns.', severity_score: 8, issues_count: 2 },
    { title: 'React Form Validation', description: 'Form handling and validation review', code_snippet: 'const handleSubmit = (e) => {\n  e.preventDefault();\n  if (!email.includes("@")) {\n    setError("Invalid email");\n    return;\n  }\n  submitForm({ email, password });\n};', language: 'javascript', status: 'pending' },
    { title: 'File Upload Handler', description: 'Secure file upload implementation', code_snippet: 'app.post("/upload", multer({ dest: "uploads/" }).single("file"), (req, res) => {\n  if (!req.file) return res.status(400).send("No file");\n  res.json({ filename: req.file.filename });\n});', language: 'javascript', status: 'completed', review_result: 'Add file type validation and size limits for security.', severity_score: 7, issues_count: 2 },
    { title: 'WebSocket Connection Manager', description: 'Real-time communication handler', code_snippet: 'io.on("connection", (socket) => {\n  console.log("Client connected");\n  socket.on("message", (data) => {\n    io.emit("broadcast", data);\n  });\n});', language: 'javascript', status: 'pending' },
    { title: 'Password Hashing Utility', description: 'Cryptographic password handling', code_snippet: 'const hashPassword = async (password) => {\n  const salt = await bcrypt.genSalt(10);\n  return bcrypt.hash(password, salt);\n};', language: 'javascript', status: 'completed', review_result: 'Salt rounds of 10 is adequate. Consider making it configurable.', severity_score: 5, issues_count: 1 },
    { title: 'API Rate Limiter', description: 'Request throttling middleware', code_snippet: 'const rateLimiter = rateLimit({\n  windowMs: 15 * 60 * 1000,\n  max: 100,\n  message: "Too many requests"\n});', language: 'javascript', status: 'pending' },
    { title: 'Data Pagination Helper', description: 'List pagination implementation', code_snippet: 'function paginate(array, page, limit) {\n  const start = (page - 1) * limit;\n  return {\n    data: array.slice(start, start + limit),\n    total: array.length,\n    pages: Math.ceil(array.length / limit)\n  };\n}', language: 'javascript', status: 'completed', review_result: 'Clean implementation. Consider adding input validation.', severity_score: 7, issues_count: 2 },
    { title: 'JWT Token Generator', description: 'Token creation and validation', code_snippet: 'const generateToken = (user) => {\n  return jwt.sign(\n    { id: user.id, email: user.email },\n    process.env.JWT_SECRET,\n    { expiresIn: "24h" }\n  );\n};', language: 'javascript', status: 'pending' },
    { title: 'Error Boundary Component', description: 'React error handling', code_snippet: 'class ErrorBoundary extends Component {\n  state = { hasError: false };\n  static getDerivedStateFromError() {\n    return { hasError: true };\n  }\n  render() {\n    return this.state.hasError ? <Fallback /> : this.props.children;\n  }\n}', language: 'javascript', status: 'completed', review_result: 'Good error boundary. Add error logging service integration.', severity_score: 3, issues_count: 2 },
    { title: 'Caching Layer Implementation', description: 'Redis caching strategy', code_snippet: 'const getFromCache = async (key) => {\n  const cached = await redis.get(key);\n  if (cached) return JSON.parse(cached);\n  const data = await fetchFromDB(key);\n  await redis.setex(key, 3600, JSON.stringify(data));\n  return data;\n};', language: 'javascript', status: 'pending' },
    { title: 'Input Sanitization Middleware', description: 'XSS prevention utility', code_snippet: 'const sanitize = (req, res, next) => {\n  for (let key in req.body) {\n    if (typeof req.body[key] === "string") {\n      req.body[key] = xss(req.body[key].trim());\n    }\n  }\n  next();\n};', language: 'javascript', status: 'completed', review_result: 'Good XSS prevention. Consider recursive sanitization for nested objects.', severity_score: 6, issues_count: 2 },
    { title: 'Database Connection Pool', description: 'Connection management setup', code_snippet: 'const pool = new Pool({\n  host: process.env.DB_HOST,\n  max: 20,\n  idleTimeoutMillis: 30000,\n  connectionTimeoutMillis: 2000\n});', language: 'javascript', status: 'pending' },
    { title: 'Event Emitter Service', description: 'Custom event handling system', code_snippet: 'class EventBus {\n  constructor() {\n    this.events = {};\n  }\n  on(event, callback) {\n    if (!this.events[event]) this.events[event] = [];\n    this.events[event].push(callback);\n  }\n  emit(event, data) {\n    this.events[event]?.forEach(cb => cb(data));\n  }\n}', language: 'javascript', status: 'completed', review_result: 'Clean implementation. Consider adding once() and off() methods.' }
  ];

  for (const item of items) {
    await query(
      `INSERT INTO code_reviews (title, description, code_snippet, language, status, review_result, severity_score, issues_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [item.title, item.description, item.code_snippet, item.language, item.status, item.review_result || null, item.severity_score || null, item.issues_count || null]
    );
  }
  console.log('Seeded code_reviews');
};

const seedDocumentation = async () => {
  const items = [
    { title: 'User Service Documentation', description: 'User management service docs', source_code: 'class UserService {\n  async createUser(data) { /* ... */ }\n  async updateUser(id, data) { /* ... */ }\n  async deleteUser(id) { /* ... */ }\n}', doc_type: 'API', language: 'javascript', status: 'completed', generated_docs: '# UserService\n\n## Methods\n- createUser(data): Creates a new user\n- updateUser(id, data): Updates existing user\n- deleteUser(id): Removes user from system' },
    { title: 'Authentication Module Docs', description: 'Auth flow documentation', source_code: 'async function authenticate(credentials) {\n  const user = await validateCredentials(credentials);\n  return generateSession(user);\n}', doc_type: 'Module', language: 'javascript', status: 'pending' },
    { title: 'Payment Gateway Integration', description: 'Payment processing docs', source_code: 'class PaymentGateway {\n  async charge(amount, card) { /* ... */ }\n  async refund(transactionId) { /* ... */ }\n}', doc_type: 'Integration', language: 'javascript', status: 'completed', generated_docs: '# PaymentGateway\n\nSecure payment processing integration.\n\n## Methods\n- charge(amount, card): Process payment\n- refund(transactionId): Process refund' },
    { title: 'Database Models Documentation', description: 'ORM model definitions', source_code: 'const UserModel = {\n  tableName: "users",\n  fields: ["id", "email", "password", "created_at"]\n};', doc_type: 'Schema', language: 'javascript', status: 'pending' },
    { title: 'Middleware Stack Docs', description: 'Express middleware documentation', source_code: 'app.use(cors());\napp.use(helmet());\napp.use(express.json());\napp.use(rateLimiter);', doc_type: 'Configuration', language: 'javascript', status: 'completed', generated_docs: '# Middleware Stack\n\n1. CORS - Cross-origin requests\n2. Helmet - Security headers\n3. JSON Parser - Body parsing\n4. Rate Limiter - Request throttling' },
    { title: 'Utility Functions Library', description: 'Helper functions docs', source_code: 'export const formatDate = (date) => { /* ... */ };\nexport const slugify = (text) => { /* ... */ };\nexport const debounce = (fn, delay) => { /* ... */ };', doc_type: 'Library', language: 'javascript', status: 'pending' },
    { title: 'React Hooks Documentation', description: 'Custom hooks reference', source_code: 'function useLocalStorage(key, initialValue) {\n  const [value, setValue] = useState(() => {\n    return localStorage.getItem(key) || initialValue;\n  });\n  return [value, setValue];\n}', doc_type: 'Hooks', language: 'javascript', status: 'completed', generated_docs: '# useLocalStorage\n\nPersists state in localStorage.\n\n## Parameters\n- key: Storage key\n- initialValue: Default value\n\n## Returns\n[value, setValue] tuple' },
    { title: 'API Client Documentation', description: 'HTTP client wrapper', source_code: 'const apiClient = {\n  get: (url) => fetch(url).then(r => r.json()),\n  post: (url, data) => fetch(url, { method: "POST", body: JSON.stringify(data) })\n};', doc_type: 'Client', language: 'javascript', status: 'pending' },
    { title: 'Validation Schema Docs', description: 'Input validation schemas', source_code: 'const userSchema = Joi.object({\n  email: Joi.string().email().required(),\n  password: Joi.string().min(8).required()\n});', doc_type: 'Validation', language: 'javascript', status: 'completed', generated_docs: '# User Validation Schema\n\n## Fields\n- email: Required, must be valid email\n- password: Required, minimum 8 characters' },
    { title: 'Logger Service Documentation', description: 'Logging infrastructure', source_code: 'const logger = {\n  info: (msg) => console.log(`[INFO] ${msg}`),\n  error: (msg) => console.error(`[ERROR] ${msg}`),\n  debug: (msg) => console.debug(`[DEBUG] ${msg}`)\n};', doc_type: 'Service', language: 'javascript', status: 'pending' },
    { title: 'State Management Docs', description: 'Redux store documentation', source_code: 'const store = configureStore({\n  reducer: { user: userReducer, cart: cartReducer },\n  middleware: [thunk, logger]\n});', doc_type: 'Store', language: 'javascript', status: 'completed', generated_docs: '# Redux Store\n\n## Reducers\n- user: User state management\n- cart: Shopping cart state\n\n## Middleware\n- thunk: Async actions\n- logger: Action logging' },
    { title: 'WebSocket Events Docs', description: 'Real-time event reference', source_code: 'socket.on("connect", onConnect);\nsocket.on("message", onMessage);\nsocket.on("disconnect", onDisconnect);', doc_type: 'Events', language: 'javascript', status: 'pending' },
    { title: 'CLI Commands Documentation', description: 'Command line interface', source_code: 'program\n  .command("build")\n  .description("Build the project")\n  .action(buildCommand);', doc_type: 'CLI', language: 'javascript', status: 'completed', generated_docs: '# CLI Commands\n\n## build\nBuilds the project for production.\n\nUsage: `cli build`' },
    { title: 'Test Utilities Docs', description: 'Testing helper functions', source_code: 'const renderWithProviders = (ui) => {\n  return render(<Providers>{ui}</Providers>);\n};', doc_type: 'Testing', language: 'javascript', status: 'pending' },
    { title: 'Configuration Module Docs', description: 'App configuration reference', source_code: 'const config = {\n  port: process.env.PORT || 3000,\n  dbUrl: process.env.DATABASE_URL,\n  apiKey: process.env.API_KEY\n};', doc_type: 'Config', language: 'javascript', status: 'completed', generated_docs: '# Configuration\n\n## Environment Variables\n- PORT: Server port (default: 3000)\n- DATABASE_URL: Database connection string\n- API_KEY: External API key' }
  ];

  for (const item of items) {
    await query(
      `INSERT INTO documentation (title, description, source_code, doc_type, language, status, generated_docs)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [item.title, item.description, item.source_code, item.doc_type, item.language, item.status, item.generated_docs || null]
    );
  }
  console.log('Seeded documentation');
};

const seedCodeAnalysis = async () => {
  const items = [
    { title: 'Authentication Flow Analysis', description: 'Analyze auth module complexity', code_snippet: 'async function login(email, password) {\n  const user = await User.findOne({ email });\n  if (!user) throw new Error("Not found");\n  if (user.locked) throw new Error("Locked");\n  const valid = await bcrypt.compare(password, user.password);\n  if (!valid) {\n    user.failedAttempts++;\n    if (user.failedAttempts >= 5) user.locked = true;\n    await user.save();\n    throw new Error("Invalid");\n  }\n  return generateToken(user);\n}', language: 'javascript', complexity_score: 8, quality_score: 75, status: 'completed', analysis_result: 'Cyclomatic complexity: 8. Consider extracting validation logic.' },
    { title: 'Data Processing Pipeline', description: 'ETL process analysis', code_snippet: 'const processData = (data) => {\n  return data\n    .filter(item => item.active)\n    .map(item => transform(item))\n    .reduce((acc, item) => ({ ...acc, [item.id]: item }), {});\n};', language: 'javascript', complexity_score: 4, quality_score: 85, status: 'completed', analysis_result: 'Clean functional approach. Low complexity.' },
    { title: 'Form Validation Logic', description: 'Client-side validation analysis', code_snippet: 'function validateForm(data) {\n  const errors = {};\n  if (!data.email) errors.email = "Required";\n  else if (!isEmail(data.email)) errors.email = "Invalid";\n  if (!data.password) errors.password = "Required";\n  else if (data.password.length < 8) errors.password = "Too short";\n  return Object.keys(errors).length ? errors : null;\n}', language: 'javascript', complexity_score: 6, quality_score: 70, status: 'pending' },
    { title: 'API Response Handler', description: 'Response formatting analysis', code_snippet: 'const handleResponse = (res, data, status = 200) => {\n  res.status(status).json({\n    success: status < 400,\n    data: status < 400 ? data : null,\n    error: status >= 400 ? data : null,\n    timestamp: new Date().toISOString()\n  });\n};', language: 'javascript', complexity_score: 3, quality_score: 90, status: 'completed', analysis_result: 'Simple and effective. Consider adding pagination support.' },
    { title: 'Search Algorithm Implementation', description: 'Binary search analysis', code_snippet: 'function binarySearch(arr, target) {\n  let left = 0, right = arr.length - 1;\n  while (left <= right) {\n    const mid = Math.floor((left + right) / 2);\n    if (arr[mid] === target) return mid;\n    if (arr[mid] < target) left = mid + 1;\n    else right = mid - 1;\n  }\n  return -1;\n}', language: 'javascript', complexity_score: 4, quality_score: 95, status: 'completed', analysis_result: 'Optimal O(log n) complexity. Well implemented.' },
    { title: 'State Management Reducer', description: 'Redux reducer analysis', code_snippet: 'const userReducer = (state = initialState, action) => {\n  switch (action.type) {\n    case "SET_USER": return { ...state, user: action.payload };\n    case "LOGOUT": return initialState;\n    case "UPDATE_PROFILE": return { ...state, user: { ...state.user, ...action.payload } };\n    default: return state;\n  }\n};', language: 'javascript', complexity_score: 5, quality_score: 80, status: 'pending' },
    { title: 'Async Queue Processor', description: 'Job queue analysis', code_snippet: 'class JobQueue {\n  constructor() { this.queue = []; this.processing = false; }\n  async add(job) {\n    this.queue.push(job);\n    if (!this.processing) await this.process();\n  }\n  async process() {\n    this.processing = true;\n    while (this.queue.length) {\n      const job = this.queue.shift();\n      await job();\n    }\n    this.processing = false;\n  }\n}', language: 'javascript', complexity_score: 6, quality_score: 75, status: 'completed', analysis_result: 'Good queue implementation. Add error handling for failed jobs.' },
    { title: 'Cache Invalidation Logic', description: 'Caching strategy analysis', code_snippet: 'const cache = new Map();\nconst getWithCache = async (key, fetchFn, ttl = 60000) => {\n  const cached = cache.get(key);\n  if (cached && Date.now() - cached.timestamp < ttl) return cached.data;\n  const data = await fetchFn();\n  cache.set(key, { data, timestamp: Date.now() });\n  return data;\n};', language: 'javascript', complexity_score: 4, quality_score: 85, status: 'pending' },
    { title: 'Permission Checker', description: 'RBAC analysis', code_snippet: 'const checkPermission = (user, resource, action) => {\n  const role = roles[user.role];\n  if (!role) return false;\n  const permissions = role.permissions[resource];\n  return permissions && permissions.includes(action);\n};', language: 'javascript', complexity_score: 4, quality_score: 80, status: 'completed', analysis_result: 'Simple RBAC. Consider adding hierarchical roles.' },
    { title: 'Data Transformer Utility', description: 'Object transformation analysis', code_snippet: 'const transformUser = (dbUser) => ({\n  id: dbUser.id,\n  name: `${dbUser.first_name} ${dbUser.last_name}`,\n  email: dbUser.email,\n  joinedAt: formatDate(dbUser.created_at)\n});', language: 'javascript', complexity_score: 2, quality_score: 92, status: 'pending' },
    { title: 'Event Handler Module', description: 'Event system analysis', code_snippet: 'const EventHandler = {\n  handlers: {},\n  on(event, fn) { (this.handlers[event] ||= []).push(fn); },\n  off(event, fn) { this.handlers[event] = this.handlers[event]?.filter(f => f !== fn); },\n  emit(event, ...args) { this.handlers[event]?.forEach(fn => fn(...args)); }\n};', language: 'javascript', complexity_score: 5, quality_score: 85, status: 'completed', analysis_result: 'Clean pub/sub pattern. Consider adding once() method.' },
    { title: 'Middleware Chain', description: 'Express middleware analysis', code_snippet: 'const authMiddleware = (req, res, next) => {\n  const token = req.headers.authorization?.split(" ")[1];\n  if (!token) return res.status(401).json({ error: "No token" });\n  try {\n    req.user = jwt.verify(token, SECRET);\n    next();\n  } catch { res.status(401).json({ error: "Invalid token" }); }\n};', language: 'javascript', complexity_score: 5, quality_score: 78, status: 'pending' },
    { title: 'Query Builder', description: 'SQL builder analysis', code_snippet: 'class QueryBuilder {\n  constructor(table) { this.table = table; this.conditions = []; }\n  where(field, value) { this.conditions.push(`${field} = ${value}`); return this; }\n  build() { return `SELECT * FROM ${this.table} WHERE ${this.conditions.join(" AND ")}`; }\n}', language: 'javascript', complexity_score: 3, quality_score: 70, status: 'completed', analysis_result: 'SQL injection risk! Use parameterized queries.' },
    { title: 'Retry Mechanism', description: 'Fault tolerance analysis', code_snippet: 'const retry = async (fn, maxRetries = 3, delay = 1000) => {\n  for (let i = 0; i < maxRetries; i++) {\n    try { return await fn(); }\n    catch (e) { if (i === maxRetries - 1) throw e; await sleep(delay); }\n  }\n};', language: 'javascript', complexity_score: 4, quality_score: 82, status: 'pending' },
    { title: 'Config Loader', description: 'Configuration loading analysis', code_snippet: 'const loadConfig = () => {\n  const env = process.env.NODE_ENV || "development";\n  const base = require("./config.base.json");\n  const envConfig = require(`./config.${env}.json`);\n  return { ...base, ...envConfig };\n};', language: 'javascript', complexity_score: 3, quality_score: 75, status: 'completed', analysis_result: 'Good config merging. Consider using dotenv for sensitive values.' }
  ];

  for (const item of items) {
    await query(
      `INSERT INTO code_analysis (title, description, code_snippet, language, complexity_score, quality_score, status, analysis_result)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [item.title, item.description, item.code_snippet, item.language, item.complexity_score || null, item.quality_score || null, item.status, item.analysis_result || null]
    );
  }
  console.log('Seeded code_analysis');
};

const seedApiDocs = async () => {
  const items = [
    { title: 'Create User Endpoint', description: 'User registration API', endpoint: '/api/users', method: 'POST', request_body: '{ "email": "string", "password": "string", "name": "string" }', response_body: '{ "id": "number", "email": "string", "name": "string" }', status: 'completed', generated_docs: '# POST /api/users\n\nCreates a new user account.\n\n## Request Body\n- email: User email (required)\n- password: User password (required)\n- name: Display name (required)' },
    { title: 'Get User Profile', description: 'Fetch user details', endpoint: '/api/users/:id', method: 'GET', request_body: null, response_body: '{ "id": "number", "email": "string", "profile": {} }', status: 'pending' },
    { title: 'Update User Settings', description: 'Modify user preferences', endpoint: '/api/users/:id/settings', method: 'PUT', request_body: '{ "notifications": "boolean", "theme": "string" }', response_body: '{ "success": "boolean" }', status: 'completed', generated_docs: '# PUT /api/users/:id/settings\n\nUpdates user preferences.\n\n## Parameters\n- id: User ID\n\n## Request Body\n- notifications: Enable notifications\n- theme: UI theme preference' },
    { title: 'Delete Account', description: 'Remove user account', endpoint: '/api/users/:id', method: 'DELETE', request_body: null, response_body: '{ "message": "string" }', status: 'pending' },
    { title: 'Login Endpoint', description: 'User authentication', endpoint: '/api/auth/login', method: 'POST', request_body: '{ "email": "string", "password": "string" }', response_body: '{ "token": "string", "user": {} }', status: 'completed', generated_docs: '# POST /api/auth/login\n\nAuthenticates user and returns JWT token.\n\n## Request Body\n- email: User email\n- password: User password\n\n## Response\n- token: JWT access token\n- user: User object' },
    { title: 'List Products', description: 'Get all products', endpoint: '/api/products', method: 'GET', request_body: null, response_body: '{ "products": [], "total": "number", "page": "number" }', status: 'pending' },
    { title: 'Create Order', description: 'Place new order', endpoint: '/api/orders', method: 'POST', request_body: '{ "items": [], "shippingAddress": {} }', response_body: '{ "orderId": "string", "total": "number" }', status: 'completed', generated_docs: '# POST /api/orders\n\nCreates a new order.\n\n## Request Body\n- items: Array of order items\n- shippingAddress: Delivery address\n\n## Response\n- orderId: Unique order identifier\n- total: Order total amount' },
    { title: 'Get Order Status', description: 'Check order progress', endpoint: '/api/orders/:id/status', method: 'GET', request_body: null, response_body: '{ "status": "string", "updatedAt": "string" }', status: 'pending' },
    { title: 'Upload File', description: 'File upload endpoint', endpoint: '/api/files/upload', method: 'POST', request_body: 'multipart/form-data', response_body: '{ "fileId": "string", "url": "string" }', status: 'completed', generated_docs: '# POST /api/files/upload\n\nUploads a file to storage.\n\n## Request\nContent-Type: multipart/form-data\n\n## Response\n- fileId: Uploaded file ID\n- url: Public URL' },
    { title: 'Search Products', description: 'Product search API', endpoint: '/api/products/search', method: 'GET', request_body: null, response_body: '{ "results": [], "count": "number" }', status: 'pending' },
    { title: 'Add to Cart', description: 'Add item to cart', endpoint: '/api/cart/items', method: 'POST', request_body: '{ "productId": "string", "quantity": "number" }', response_body: '{ "cartId": "string", "items": [] }', status: 'completed', generated_docs: '# POST /api/cart/items\n\nAdds an item to shopping cart.\n\n## Request Body\n- productId: Product to add\n- quantity: Number of items\n\n## Response\n- cartId: Cart identifier\n- items: Updated cart items' },
    { title: 'Process Payment', description: 'Payment processing', endpoint: '/api/payments/charge', method: 'POST', request_body: '{ "amount": "number", "currency": "string", "source": "string" }', response_body: '{ "transactionId": "string", "status": "string" }', status: 'pending' },
    { title: 'Get Notifications', description: 'User notifications list', endpoint: '/api/notifications', method: 'GET', request_body: null, response_body: '{ "notifications": [], "unread": "number" }', status: 'completed', generated_docs: '# GET /api/notifications\n\nRetrieves user notifications.\n\n## Response\n- notifications: List of notifications\n- unread: Unread count' },
    { title: 'Refresh Token', description: 'Token refresh endpoint', endpoint: '/api/auth/refresh', method: 'POST', request_body: '{ "refreshToken": "string" }', response_body: '{ "accessToken": "string" }', status: 'pending' },
    { title: 'Health Check', description: 'API health status', endpoint: '/api/health', method: 'GET', request_body: null, response_body: '{ "status": "string", "version": "string" }', status: 'completed', generated_docs: '# GET /api/health\n\nReturns API health status.\n\n## Response\n- status: "ok" or "error"\n- version: API version' }
  ];

  for (const item of items) {
    await query(
      `INSERT INTO api_docs (title, description, endpoint, method, request_body, response_body, status, generated_docs)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [item.title, item.description, item.endpoint, item.method, item.request_body, item.response_body, item.status, item.generated_docs || null]
    );
  }
  console.log('Seeded api_docs');
};

const seedReadmeProjects = async () => {
  const items = [
    { title: 'E-Commerce Platform', description: 'Full-stack online store', project_structure: 'src/\n  components/\n  pages/\n  api/\n  utils/', tech_stack: 'React, Node.js, PostgreSQL, Redis', status: 'completed', generated_readme: '# E-Commerce Platform\n\nA modern e-commerce solution.\n\n## Features\n- Product catalog\n- Shopping cart\n- Secure checkout\n\n## Tech Stack\nReact, Node.js, PostgreSQL, Redis' },
    { title: 'Task Management App', description: 'Kanban-style task tracker', project_structure: 'app/\n  models/\n  views/\n  controllers/', tech_stack: 'Vue.js, Express, MongoDB', status: 'pending' },
    { title: 'Real-time Chat Application', description: 'WebSocket-based messaging', project_structure: 'client/\n  src/\nserver/\n  handlers/', tech_stack: 'React, Socket.io, Node.js', status: 'completed', generated_readme: '# Real-time Chat\n\nInstant messaging application.\n\n## Features\n- Private messaging\n- Group chats\n- File sharing' },
    { title: 'Blog Platform', description: 'Content management system', project_structure: 'posts/\nadmin/\napi/\nthemes/', tech_stack: 'Next.js, Prisma, PostgreSQL', status: 'pending' },
    { title: 'Weather Dashboard', description: 'Weather forecasting app', project_structure: 'components/\nservices/\nhooks/', tech_stack: 'React, OpenWeather API, Chart.js', status: 'completed', generated_readme: '# Weather Dashboard\n\nReal-time weather information.\n\n## Features\n- Current conditions\n- 7-day forecast\n- Interactive maps' },
    { title: 'Fitness Tracker', description: 'Health and workout app', project_structure: 'mobile/\nbackend/\nshared/', tech_stack: 'React Native, Node.js, MongoDB', status: 'pending' },
    { title: 'Invoice Generator', description: 'Business invoicing tool', project_structure: 'templates/\ngenerator/\npreview/', tech_stack: 'Python, Flask, WeasyPrint', status: 'completed', generated_readme: '# Invoice Generator\n\nProfessional invoicing solution.\n\n## Features\n- Custom templates\n- PDF export\n- Client management' },
    { title: 'Social Media Dashboard', description: 'Analytics aggregator', project_structure: 'integrations/\nanalytics/\nreports/', tech_stack: 'React, D3.js, Node.js', status: 'pending' },
    { title: 'Learning Management System', description: 'Online course platform', project_structure: 'courses/\nstudents/\ninstructors/\nassessments/', tech_stack: 'Django, React, PostgreSQL', status: 'completed', generated_readme: '# Learning Management System\n\nComprehensive e-learning platform.\n\n## Features\n- Course creation\n- Progress tracking\n- Assessments\n- Certificates' },
    { title: 'Inventory Management', description: 'Stock tracking system', project_structure: 'products/\norders/\nreports/\napi/', tech_stack: 'Vue.js, Laravel, MySQL', status: 'pending' },
    { title: 'Recipe Sharing App', description: 'Cooking community platform', project_structure: 'recipes/\nusers/\nsocial/\nsearch/', tech_stack: 'Next.js, Supabase', status: 'completed', generated_readme: '# Recipe Sharing\n\nCommunity cooking platform.\n\n## Features\n- Recipe sharing\n- Meal planning\n- Shopping lists\n- Social features' },
    { title: 'Portfolio Website', description: 'Personal portfolio template', project_structure: 'pages/\ncomponents/\nstyles/\ndata/', tech_stack: 'Astro, Tailwind CSS', status: 'pending' },
    { title: 'Event Management System', description: 'Event planning platform', project_structure: 'events/\ntickets/\nvendors/\nanalytics/', tech_stack: 'React, Express, PostgreSQL, Stripe', status: 'completed', generated_readme: '# Event Management\n\nComplete event planning solution.\n\n## Features\n- Event creation\n- Ticket sales\n- Vendor management\n- Attendee tracking' },
    { title: 'Project Management Tool', description: 'Team collaboration app', project_structure: 'projects/\ntasks/\nteams/\nreports/', tech_stack: 'Angular, NestJS, PostgreSQL', status: 'pending' },
    { title: 'API Gateway Service', description: 'Microservices gateway', project_structure: 'gateway/\nauth/\nrouting/\nmonitoring/', tech_stack: 'Go, Redis, Kubernetes', status: 'completed', generated_readme: '# API Gateway\n\nMicroservices API gateway.\n\n## Features\n- Request routing\n- Rate limiting\n- Authentication\n- Monitoring' }
  ];

  for (const item of items) {
    await query(
      `INSERT INTO readme_projects (title, description, project_structure, tech_stack, status, generated_readme)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [item.title, item.description, item.project_structure, item.tech_stack, item.status, item.generated_readme || null]
    );
  }
  console.log('Seeded readme_projects');
};

const seedCodeComments = async () => {
  const items = [
    { title: 'User Authentication Function', description: 'Add docstrings to auth logic', code_snippet: 'async function authenticateUser(email, password) {\n  const user = await User.findByEmail(email);\n  if (!user) return null;\n  const isValid = await comparePassword(password, user.hash);\n  return isValid ? createSession(user) : null;\n}', language: 'javascript', comment_style: 'JSDoc', status: 'completed', generated_comments: '/**\n * Authenticates a user with email and password\n * @param {string} email - User email address\n * @param {string} password - Plain text password\n * @returns {Promise<Session|null>} Session object or null if auth fails\n */\nasync function authenticateUser(email, password) {' },
    { title: 'Data Processing Pipeline', description: 'Document ETL functions', code_snippet: 'const processRecords = (records) => {\n  return records\n    .filter(r => r.active)\n    .map(r => transformRecord(r))\n    .reduce((acc, r) => [...acc, r], []);\n};', language: 'javascript', comment_style: 'inline', status: 'pending' },
    { title: 'React Custom Hook', description: 'Add hook documentation', code_snippet: 'function useDebounce(value, delay) {\n  const [debouncedValue, setDebouncedValue] = useState(value);\n  useEffect(() => {\n    const timer = setTimeout(() => setDebouncedValue(value), delay);\n    return () => clearTimeout(timer);\n  }, [value, delay]);\n  return debouncedValue;\n}', language: 'javascript', comment_style: 'JSDoc', status: 'completed', generated_comments: '/**\n * Custom hook that debounces a value\n * @param {any} value - The value to debounce\n * @param {number} delay - Debounce delay in milliseconds\n * @returns {any} The debounced value\n */\nfunction useDebounce(value, delay) {' },
    { title: 'Database Query Builder', description: 'Document query methods', code_snippet: 'class QueryBuilder {\n  select(fields) {\n    this.fields = fields;\n    return this;\n  }\n  where(condition) {\n    this.conditions.push(condition);\n    return this;\n  }\n  execute() {\n    return db.query(this.build());\n  }\n}', language: 'javascript', comment_style: 'JSDoc', status: 'pending' },
    { title: 'API Middleware Stack', description: 'Comment middleware functions', code_snippet: 'const validateRequest = (schema) => (req, res, next) => {\n  const { error } = schema.validate(req.body);\n  if (error) return res.status(400).json({ error: error.message });\n  next();\n};', language: 'javascript', comment_style: 'inline', status: 'completed', generated_comments: '/**\n * Creates validation middleware for request body\n * @param {Object} schema - Joi validation schema\n * @returns {Function} Express middleware function\n */\nconst validateRequest = (schema) => (req, res, next) => {\n  // Validate request body against schema\n  const { error } = schema.validate(req.body);' },
    { title: 'Event Emitter Class', description: 'Document event methods', code_snippet: 'class EventEmitter {\n  on(event, listener) {\n    this.listeners[event] = this.listeners[event] || [];\n    this.listeners[event].push(listener);\n  }\n  emit(event, data) {\n    this.listeners[event]?.forEach(fn => fn(data));\n  }\n}', language: 'javascript', comment_style: 'JSDoc', status: 'pending' },
    { title: 'File Upload Handler', description: 'Add upload documentation', code_snippet: 'const handleUpload = async (file, options = {}) => {\n  const { maxSize = 5MB, allowedTypes = ["image/*"] } = options;\n  if (file.size > maxSize) throw new Error("File too large");\n  if (!matchType(file.type, allowedTypes)) throw new Error("Invalid type");\n  return await storage.save(file);\n};', language: 'javascript', comment_style: 'JSDoc', status: 'completed', generated_comments: '/**\n * Handles file upload with validation\n * @param {File} file - The file to upload\n * @param {Object} options - Upload options\n * @param {number} options.maxSize - Maximum file size in bytes\n * @param {string[]} options.allowedTypes - Allowed MIME types\n * @returns {Promise<string>} Uploaded file URL\n * @throws {Error} If file exceeds size limit or type not allowed\n */' },
    { title: 'Cache Implementation', description: 'Document cache methods', code_snippet: 'const cache = {\n  store: new Map(),\n  get(key) { return this.store.get(key); },\n  set(key, value, ttl) {\n    this.store.set(key, { value, expires: Date.now() + ttl });\n  },\n  has(key) {\n    const item = this.store.get(key);\n    return item && item.expires > Date.now();\n  }\n};', language: 'javascript', comment_style: 'inline', status: 'pending' },
    { title: 'Redux Action Creators', description: 'Add action documentation', code_snippet: 'const fetchUser = (userId) => async (dispatch) => {\n  dispatch({ type: "FETCH_USER_START" });\n  try {\n    const user = await api.getUser(userId);\n    dispatch({ type: "FETCH_USER_SUCCESS", payload: user });\n  } catch (error) {\n    dispatch({ type: "FETCH_USER_ERROR", payload: error });\n  }\n};', language: 'javascript', comment_style: 'JSDoc', status: 'completed', generated_comments: '/**\n * Async action creator for fetching user data\n * @param {string} userId - The ID of the user to fetch\n * @returns {Function} Redux thunk function\n */\nconst fetchUser = (userId) => async (dispatch) => {' },
    { title: 'Form Validation Utils', description: 'Document validators', code_snippet: 'const validators = {\n  email: (value) => /^[^@]+@[^@]+\\.[^@]+$/.test(value),\n  minLength: (min) => (value) => value.length >= min,\n  required: (value) => value !== null && value !== undefined && value !== ""\n};', language: 'javascript', comment_style: 'JSDoc', status: 'pending' },
    { title: 'WebSocket Manager', description: 'Add connection documentation', code_snippet: 'class WebSocketManager {\n  connect(url) {\n    this.ws = new WebSocket(url);\n    this.ws.onopen = () => this.emit("connected");\n    this.ws.onmessage = (e) => this.emit("message", JSON.parse(e.data));\n    this.ws.onclose = () => this.reconnect();\n  }\n}', language: 'javascript', comment_style: 'JSDoc', status: 'completed', generated_comments: '/**\n * Manages WebSocket connections with auto-reconnect\n */\nclass WebSocketManager {\n  /**\n   * Establishes WebSocket connection\n   * @param {string} url - WebSocket server URL\n   */\n  connect(url) {' },
    { title: 'Date Formatting Utils', description: 'Document date helpers', code_snippet: 'const formatDate = (date, format = "YYYY-MM-DD") => {\n  const d = new Date(date);\n  return format\n    .replace("YYYY", d.getFullYear())\n    .replace("MM", String(d.getMonth() + 1).padStart(2, "0"))\n    .replace("DD", String(d.getDate()).padStart(2, "0"));\n};', language: 'javascript', comment_style: 'JSDoc', status: 'pending' },
    { title: 'Error Handler Middleware', description: 'Add error handling docs', code_snippet: 'const errorHandler = (err, req, res, next) => {\n  const status = err.status || 500;\n  const message = err.message || "Internal Server Error";\n  logger.error({ err, req });\n  res.status(status).json({ error: message });\n};', language: 'javascript', comment_style: 'inline', status: 'completed', generated_comments: '/**\n * Express error handling middleware\n * Logs errors and sends appropriate response\n * @param {Error} err - The error object\n * @param {Request} req - Express request\n * @param {Response} res - Express response\n * @param {Function} next - Next middleware\n */' },
    { title: 'Permission Checker', description: 'Document auth helpers', code_snippet: 'const hasPermission = (user, resource, action) => {\n  const role = roles[user.role];\n  if (!role) return false;\n  const perms = role.permissions[resource];\n  return perms?.includes(action) || perms?.includes("*");\n};', language: 'javascript', comment_style: 'JSDoc', status: 'pending' },
    { title: 'Pagination Helper', description: 'Add pagination docs', code_snippet: 'const paginate = (items, page = 1, perPage = 10) => {\n  const total = items.length;\n  const totalPages = Math.ceil(total / perPage);\n  const start = (page - 1) * perPage;\n  return {\n    data: items.slice(start, start + perPage),\n    meta: { page, perPage, total, totalPages }\n  };\n};', language: 'javascript', comment_style: 'JSDoc', status: 'completed', generated_comments: '/**\n * Paginates an array of items\n * @param {Array} items - Items to paginate\n * @param {number} page - Current page (1-indexed)\n * @param {number} perPage - Items per page\n * @returns {Object} Paginated data with metadata\n */' }
  ];

  for (const item of items) {
    await query(
      `INSERT INTO code_comments (title, description, code_snippet, language, comment_style, status, generated_comments)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [item.title, item.description, item.code_snippet, item.language, item.comment_style, item.status, item.generated_comments || null]
    );
  }
  console.log('Seeded code_comments');
};

const seedSecurityScans = async () => {
  const items = [
    { title: 'User Input Handler', description: 'Check for injection vulnerabilities', code_snippet: 'app.get("/search", (req, res) => {\n  const query = req.query.q;\n  const sql = `SELECT * FROM products WHERE name LIKE "%${query}%"`;\n  db.query(sql, (err, results) => res.json(results));\n});', language: 'javascript', risk_level: 'critical', status: 'completed', vulnerabilities: 'SQL Injection vulnerability detected. User input directly concatenated into SQL query.', recommendations: 'Use parameterized queries or prepared statements.' },
    { title: 'Authentication Endpoint', description: 'Review auth security', code_snippet: 'app.post("/login", (req, res) => {\n  const { username, password } = req.body;\n  const user = users.find(u => u.username === username && u.password === password);\n  if (user) res.json({ token: btoa(user.id) });\n  else res.status(401).json({ error: "Invalid credentials" });\n});', language: 'javascript', risk_level: 'high', status: 'pending' },
    { title: 'File Upload Endpoint', description: 'Check for file upload risks', code_snippet: 'app.post("/upload", (req, res) => {\n  const file = req.files.file;\n  file.mv(`./uploads/${file.name}`, (err) => {\n    if (err) return res.status(500).send(err);\n    res.send("File uploaded");\n  });\n});', language: 'javascript', risk_level: 'high', status: 'completed', vulnerabilities: 'Path traversal vulnerability. No file type validation. No size limits.', recommendations: 'Validate file types, sanitize filenames, add size limits, store outside webroot.' },
    { title: 'Session Management', description: 'Review session handling', code_snippet: 'app.use(session({\n  secret: "mysecret",\n  resave: false,\n  saveUninitialized: true,\n  cookie: { secure: false }\n}));', language: 'javascript', risk_level: 'medium', status: 'pending' },
    { title: 'Password Storage', description: 'Check password handling', code_snippet: 'const createUser = (email, password) => {\n  const hashedPassword = md5(password);\n  return db.insert({ email, password: hashedPassword });\n};', language: 'javascript', risk_level: 'critical', status: 'completed', vulnerabilities: 'MD5 is cryptographically broken. No salt used for password hashing.', recommendations: 'Use bcrypt, argon2, or scrypt with proper salt rounds.' },
    { title: 'API Key Handling', description: 'Review API key security', code_snippet: 'const API_KEY = "sk_live_abc123";\nconst fetchData = async () => {\n  const res = await fetch(url, { headers: { "X-API-Key": API_KEY } });\n  return res.json();\n};', language: 'javascript', risk_level: 'high', status: 'pending' },
    { title: 'CORS Configuration', description: 'Check CORS settings', code_snippet: 'app.use(cors({\n  origin: "*",\n  credentials: true\n}));', language: 'javascript', risk_level: 'medium', status: 'completed', vulnerabilities: 'Wildcard CORS with credentials enabled allows any origin to make authenticated requests.', recommendations: 'Specify allowed origins explicitly. Never use * with credentials.' },
    { title: 'JWT Implementation', description: 'Review token security', code_snippet: 'const generateToken = (user) => {\n  return jwt.sign(user, "secret123");\n};\nconst verifyToken = (token) => {\n  return jwt.verify(token, "secret123");\n};', language: 'javascript', risk_level: 'high', status: 'pending' },
    { title: 'HTML Rendering', description: 'Check for XSS vulnerabilities', code_snippet: 'app.get("/profile", (req, res) => {\n  const name = req.query.name;\n  res.send(`<h1>Hello, ${name}!</h1>`);\n});', language: 'javascript', risk_level: 'critical', status: 'completed', vulnerabilities: 'Reflected XSS vulnerability. User input rendered directly in HTML.', recommendations: 'Escape HTML entities. Use templating engines with auto-escaping.' },
    { title: 'Database Connection', description: 'Review DB security', code_snippet: 'const db = mysql.createConnection({\n  host: "localhost",\n  user: "root",\n  password: "",\n  database: "app"\n});', language: 'javascript', risk_level: 'medium', status: 'pending' },
    { title: 'Command Execution', description: 'Check for command injection', code_snippet: 'app.get("/ping", (req, res) => {\n  const host = req.query.host;\n  exec(`ping -c 1 ${host}`, (err, stdout) => {\n    res.send(stdout);\n  });\n});', language: 'javascript', risk_level: 'critical', status: 'completed', vulnerabilities: 'Command injection vulnerability. Attacker can execute arbitrary commands.', recommendations: 'Never pass user input to shell commands. Use allowlists or safer APIs.' },
    { title: 'Error Handling', description: 'Review error exposure', code_snippet: 'app.use((err, req, res, next) => {\n  res.status(500).json({\n    error: err.message,\n    stack: err.stack,\n    query: req.query\n  });\n});', language: 'javascript', risk_level: 'medium', status: 'pending' },
    { title: 'Cookie Security', description: 'Check cookie settings', code_snippet: 'res.cookie("auth_token", token, {\n  httpOnly: false,\n  secure: false,\n  sameSite: "none"\n});', language: 'javascript', risk_level: 'high', status: 'completed', vulnerabilities: 'Auth cookie accessible via JavaScript, sent over HTTP, and vulnerable to CSRF.', recommendations: 'Set httpOnly: true, secure: true, sameSite: strict or lax.' },
    { title: 'Rate Limiting', description: 'Review DoS protection', code_snippet: 'app.post("/api/data", async (req, res) => {\n  const result = await heavyComputation(req.body);\n  res.json(result);\n});', language: 'javascript', risk_level: 'medium', status: 'pending' },
    { title: 'Redirect Handling', description: 'Check for open redirect', code_snippet: 'app.get("/redirect", (req, res) => {\n  const url = req.query.url;\n  res.redirect(url);\n});', language: 'javascript', risk_level: 'medium', status: 'completed', vulnerabilities: 'Open redirect vulnerability. Attacker can redirect users to malicious sites.', recommendations: 'Validate redirect URLs against an allowlist of trusted domains.' }
  ];

  for (const item of items) {
    await query(
      `INSERT INTO security_scans (title, description, code_snippet, language, risk_level, status, vulnerabilities, recommendations)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [item.title, item.description, item.code_snippet, item.language, item.risk_level, item.status, item.vulnerabilities || null, item.recommendations || null]
    );
  }
  console.log('Seeded security_scans');
};

const seedPerformanceReports = async () => {
  const items = [
    { title: 'Database Query Optimization', description: 'Analyze N+1 query pattern', code_snippet: 'const getUsers = async () => {\n  const users = await User.findAll();\n  for (const user of users) {\n    user.orders = await Order.findAll({ where: { userId: user.id } });\n  }\n  return users;\n};', language: 'javascript', performance_score: 35, status: 'completed', bottlenecks: 'N+1 query problem causing excessive database calls', optimization_suggestions: 'Use eager loading: User.findAll({ include: Order })' },
    { title: 'Array Processing', description: 'Review array operations', code_snippet: 'const processItems = (items) => {\n  let result = [];\n  for (let i = 0; i < items.length; i++) {\n    if (items[i].active) {\n      result = [...result, transform(items[i])];\n    }\n  }\n  return result;\n};', language: 'javascript', performance_score: 45, status: 'pending' },
    { title: 'React Component Rendering', description: 'Check unnecessary re-renders', code_snippet: 'const UserList = ({ users }) => {\n  const sorted = users.sort((a, b) => a.name.localeCompare(b.name));\n  return sorted.map(user => <UserCard key={user.id} user={user} />);\n};', language: 'javascript', performance_score: 50, status: 'completed', bottlenecks: 'Sorting on every render. Array mutation in render.', optimization_suggestions: 'Use useMemo for sorted array. Avoid mutating props.' },
    { title: 'API Response Handling', description: 'Review data fetching', code_snippet: 'useEffect(() => {\n  fetch("/api/data").then(r => r.json()).then(setData);\n  fetch("/api/stats").then(r => r.json()).then(setStats);\n  fetch("/api/config").then(r => r.json()).then(setConfig);\n}, []);', language: 'javascript', performance_score: 55, status: 'pending' },
    { title: 'String Concatenation', description: 'Analyze string operations', code_snippet: 'const buildReport = (items) => {\n  let html = "";\n  for (const item of items) {\n    html += `<div>${item.name}</div>`;\n  }\n  return html;\n};', language: 'javascript', performance_score: 60, status: 'completed', bottlenecks: 'String concatenation in loop creates new strings each iteration', optimization_suggestions: 'Use array join or template literals with map' },
    { title: 'Event Handler Optimization', description: 'Check event listener efficiency', code_snippet: 'const List = ({ items, onItemClick }) => {\n  return items.map(item => (\n    <div onClick={() => onItemClick(item.id)}>\n      {item.name}\n    </div>\n  ));\n};', language: 'javascript', performance_score: 65, status: 'pending' },
    { title: 'Memory Leak Detection', description: 'Review cleanup patterns', code_snippet: 'useEffect(() => {\n  const interval = setInterval(() => {\n    fetchData().then(setData);\n  }, 5000);\n}, []);', language: 'javascript', performance_score: 40, status: 'completed', bottlenecks: 'Missing cleanup function causes memory leak', optimization_suggestions: 'Return cleanup function: return () => clearInterval(interval)' },
    { title: 'Image Loading Strategy', description: 'Analyze image optimization', code_snippet: 'const Gallery = ({ images }) => {\n  return images.map(img => (\n    <img src={img.fullSizeUrl} alt={img.title} />\n  ));\n};', language: 'javascript', performance_score: 30, status: 'pending' },
    { title: 'Search Algorithm', description: 'Review search implementation', code_snippet: 'const search = (items, query) => {\n  return items.filter(item => \n    item.name.toLowerCase().includes(query.toLowerCase())\n  );\n};', language: 'javascript', performance_score: 70, status: 'completed', bottlenecks: 'Linear search on every keystroke', optimization_suggestions: 'Implement debouncing. Consider indexing for large datasets.' },
    { title: 'State Update Batching', description: 'Check state updates', code_snippet: 'const handleSubmit = async () => {\n  setLoading(true);\n  setError(null);\n  setData(null);\n  const result = await fetchData();\n  setData(result);\n  setLoading(false);\n};', language: 'javascript', performance_score: 75, status: 'pending' },
    { title: 'Recursive Function Analysis', description: 'Review recursion efficiency', code_snippet: 'const fibonacci = (n) => {\n  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n};', language: 'javascript', performance_score: 20, status: 'completed', bottlenecks: 'Exponential time complexity O(2^n)', optimization_suggestions: 'Use memoization or iterative approach for O(n)' },
    { title: 'DOM Manipulation', description: 'Analyze DOM operations', code_snippet: 'const updateList = (items) => {\n  const container = document.getElementById("list");\n  items.forEach(item => {\n    container.innerHTML += `<div>${item}</div>`;\n  });\n};', language: 'javascript', performance_score: 25, status: 'pending' },
    { title: 'Data Transformation Pipeline', description: 'Review data processing', code_snippet: 'const process = (data) => {\n  const filtered = data.filter(x => x.active);\n  const mapped = filtered.map(x => transform(x));\n  const sorted = mapped.sort((a, b) => a.value - b.value);\n  return sorted;\n};', language: 'javascript', performance_score: 80, status: 'completed', bottlenecks: 'Multiple array iterations', optimization_suggestions: 'Chain operations or use single reduce for better performance' },
    { title: 'WebSocket Message Handling', description: 'Check message processing', code_snippet: 'socket.on("message", (data) => {\n  const parsed = JSON.parse(data);\n  updateState(parsed);\n  saveToStorage(parsed);\n  notifyListeners(parsed);\n});', language: 'javascript', performance_score: 70, status: 'pending' },
    { title: 'Lazy Loading Implementation', description: 'Review code splitting', code_snippet: 'import Home from "./pages/Home";\nimport About from "./pages/About";\nimport Dashboard from "./pages/Dashboard";\nimport Settings from "./pages/Settings";', language: 'javascript', performance_score: 40, status: 'completed', bottlenecks: 'All pages loaded upfront increasing initial bundle size', optimization_suggestions: 'Use React.lazy() and Suspense for code splitting' }
  ];

  for (const item of items) {
    await query(
      `INSERT INTO performance_reports (title, description, code_snippet, language, performance_score, status, bottlenecks, optimization_suggestions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [item.title, item.description, item.code_snippet, item.language, item.performance_score || null, item.status, item.bottlenecks || null, item.optimization_suggestions || null]
    );
  }
  console.log('Seeded performance_reports');
};

const seedTestGenerations = async () => {
  const items = [
    { title: 'User Registration Function', description: 'Generate tests for signup', source_code: 'async function registerUser(email, password, name) {\n  if (!email || !password) throw new Error("Missing fields");\n  if (password.length < 8) throw new Error("Password too short");\n  const exists = await User.findByEmail(email);\n  if (exists) throw new Error("Email taken");\n  return User.create({ email, password: hash(password), name });\n}', language: 'javascript', test_framework: 'Jest', coverage_estimate: 90, status: 'completed', generated_tests: 'describe("registerUser", () => {\n  it("should create user with valid input", async () => {...});\n  it("should throw if email missing", async () => {...});\n  it("should throw if password too short", async () => {...});\n  it("should throw if email exists", async () => {...});\n});' },
    { title: 'Shopping Cart Calculator', description: 'Generate cart tests', source_code: 'function calculateTotal(items, discount = 0) {\n  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);\n  const discountAmount = subtotal * (discount / 100);\n  return subtotal - discountAmount;\n}', language: 'javascript', test_framework: 'Jest', coverage_estimate: 85, status: 'pending' },
    { title: 'Date Formatter Utility', description: 'Generate date tests', source_code: 'function formatDate(date, format) {\n  const d = new Date(date);\n  if (isNaN(d)) return "Invalid date";\n  return format\n    .replace("YYYY", d.getFullYear())\n    .replace("MM", String(d.getMonth() + 1).padStart(2, "0"))\n    .replace("DD", String(d.getDate()).padStart(2, "0"));\n}', language: 'javascript', test_framework: 'Jest', coverage_estimate: 95, status: 'completed', generated_tests: 'describe("formatDate", () => {\n  it("formats date correctly", () => {...});\n  it("handles invalid date", () => {...});\n  it("pads single digits", () => {...});\n});' },
    { title: 'Email Validator', description: 'Generate validation tests', source_code: 'function isValidEmail(email) {\n  if (!email || typeof email !== "string") return false;\n  const regex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;\n  return regex.test(email);\n}', language: 'javascript', test_framework: 'Jest', coverage_estimate: 100, status: 'pending' },
    { title: 'Array Sorting Function', description: 'Generate sorting tests', source_code: 'function sortByProperty(arr, prop, order = "asc") {\n  return [...arr].sort((a, b) => {\n    if (order === "asc") return a[prop] > b[prop] ? 1 : -1;\n    return a[prop] < b[prop] ? 1 : -1;\n  });\n}', language: 'javascript', test_framework: 'Jest', coverage_estimate: 90, status: 'completed', generated_tests: 'describe("sortByProperty", () => {\n  it("sorts ascending by default", () => {...});\n  it("sorts descending when specified", () => {...});\n  it("does not mutate original array", () => {...});\n});' },
    { title: 'API Response Handler', description: 'Generate API tests', source_code: 'async function fetchUser(id) {\n  const response = await fetch(`/api/users/${id}`);\n  if (!response.ok) throw new Error("User not found");\n  return response.json();\n}', language: 'javascript', test_framework: 'Jest', coverage_estimate: 80, status: 'pending' },
    { title: 'Password Strength Checker', description: 'Generate password tests', source_code: 'function checkPasswordStrength(password) {\n  let score = 0;\n  if (password.length >= 8) score++;\n  if (/[A-Z]/.test(password)) score++;\n  if (/[0-9]/.test(password)) score++;\n  if (/[^A-Za-z0-9]/.test(password)) score++;\n  return ["weak", "fair", "good", "strong"][score] || "weak";\n}', language: 'javascript', test_framework: 'Jest', coverage_estimate: 100, status: 'completed', generated_tests: 'describe("checkPasswordStrength", () => {\n  it("returns weak for short password", () => {...});\n  it("returns strong for complex password", () => {...});\n  it("increments score for each criteria", () => {...});\n});' },
    { title: 'React Toggle Component', description: 'Generate component tests', source_code: 'function Toggle({ value, onChange }) {\n  return (\n    <button onClick={() => onChange(!value)}>\n      {value ? "On" : "Off"}\n    </button>\n  );\n}', language: 'javascript', test_framework: 'React Testing Library', coverage_estimate: 85, status: 'pending' },
    { title: 'URL Parser Utility', description: 'Generate URL tests', source_code: 'function parseQueryString(url) {\n  const params = {};\n  const queryString = url.split("?")[1];\n  if (!queryString) return params;\n  queryString.split("&").forEach(pair => {\n    const [key, value] = pair.split("=");\n    params[decodeURIComponent(key)] = decodeURIComponent(value || "");\n  });\n  return params;\n}', language: 'javascript', test_framework: 'Jest', coverage_estimate: 95, status: 'completed', generated_tests: 'describe("parseQueryString", () => {\n  it("parses query params correctly", () => {...});\n  it("handles URL without query", () => {...});\n  it("decodes URI components", () => {...});\n});' },
    { title: 'Debounce Function', description: 'Generate debounce tests', source_code: 'function debounce(fn, delay) {\n  let timer;\n  return function(...args) {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn.apply(this, args), delay);\n  };\n}', language: 'javascript', test_framework: 'Jest', coverage_estimate: 80, status: 'pending' },
    { title: 'LocalStorage Wrapper', description: 'Generate storage tests', source_code: 'const storage = {\n  get(key) {\n    const item = localStorage.getItem(key);\n    return item ? JSON.parse(item) : null;\n  },\n  set(key, value) {\n    localStorage.setItem(key, JSON.stringify(value));\n  },\n  remove(key) {\n    localStorage.removeItem(key);\n  }\n};', language: 'javascript', test_framework: 'Jest', coverage_estimate: 100, status: 'completed', generated_tests: 'describe("storage", () => {\n  it("stores and retrieves values", () => {...});\n  it("returns null for missing keys", () => {...});\n  it("removes items correctly", () => {...});\n});' },
    { title: 'Number Formatter', description: 'Generate format tests', source_code: 'function formatNumber(num, decimals = 2) {\n  if (typeof num !== "number" || isNaN(num)) return "0";\n  return num.toLocaleString("en-US", {\n    minimumFractionDigits: decimals,\n    maximumFractionDigits: decimals\n  });\n}', language: 'javascript', test_framework: 'Jest', coverage_estimate: 90, status: 'pending' },
    { title: 'Object Deep Clone', description: 'Generate clone tests', source_code: 'function deepClone(obj) {\n  if (obj === null || typeof obj !== "object") return obj;\n  if (Array.isArray(obj)) return obj.map(item => deepClone(item));\n  return Object.fromEntries(\n    Object.entries(obj).map(([k, v]) => [k, deepClone(v)])\n  );\n}', language: 'javascript', test_framework: 'Jest', coverage_estimate: 95, status: 'completed', generated_tests: 'describe("deepClone", () => {\n  it("clones primitive values", () => {...});\n  it("clones arrays deeply", () => {...});\n  it("clones nested objects", () => {...});\n  it("handles null values", () => {...});\n});' },
    { title: 'Event Emitter', description: 'Generate emitter tests', source_code: 'class EventEmitter {\n  constructor() { this.events = {}; }\n  on(event, fn) { (this.events[event] ||= []).push(fn); }\n  off(event, fn) { this.events[event] = this.events[event]?.filter(f => f !== fn); }\n  emit(event, ...args) { this.events[event]?.forEach(fn => fn(...args)); }\n}', language: 'javascript', test_framework: 'Jest', coverage_estimate: 100, status: 'pending' },
    { title: 'Retry Mechanism', description: 'Generate retry tests', source_code: 'async function retry(fn, maxAttempts = 3, delay = 1000) {\n  for (let i = 0; i < maxAttempts; i++) {\n    try { return await fn(); }\n    catch (e) {\n      if (i === maxAttempts - 1) throw e;\n      await new Promise(r => setTimeout(r, delay));\n    }\n  }\n}', language: 'javascript', test_framework: 'Jest', coverage_estimate: 85, status: 'completed', generated_tests: 'describe("retry", () => {\n  it("returns on first success", async () => {...});\n  it("retries on failure", async () => {...});\n  it("throws after max attempts", async () => {...});\n});' }
  ];

  for (const item of items) {
    await query(
      `INSERT INTO test_generations (title, description, source_code, language, test_framework, coverage_estimate, status, generated_tests)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [item.title, item.description, item.source_code, item.language, item.test_framework, item.coverage_estimate || null, item.status, item.generated_tests || null]
    );
  }
  console.log('Seeded test_generations');
};

// Seed Teams
const seedTeams = async () => {
  const items = [
    { name: 'Frontend Team', description: 'React, Vue, and Angular specialists' },
    { name: 'Backend Team', description: 'Node.js, Python, and Go developers' },
    { name: 'Security Team', description: 'Security auditing and vulnerability assessment' },
    { name: 'DevOps Team', description: 'CI/CD, infrastructure, and deployment' },
    { name: 'QA Team', description: 'Testing and quality assurance' }
  ];

  for (const item of items) {
    await query(
      `INSERT INTO teams (name, description) VALUES ($1, $2)`,
      [item.name, item.description]
    );
  }
  console.log('Seeded teams');
};

// Seed Team Members
const seedTeamMembers = async () => {
  const items = [
    // Frontend Team (id: 1)
    { team_id: 1, email: 'alice@example.com', name: 'Alice Johnson', role: 'lead' },
    { team_id: 1, email: 'bob@example.com', name: 'Bob Smith', role: 'member' },
    { team_id: 1, email: 'carol@example.com', name: 'Carol Williams', role: 'member' },
    // Backend Team (id: 2)
    { team_id: 2, email: 'david@example.com', name: 'David Brown', role: 'lead' },
    { team_id: 2, email: 'emma@example.com', name: 'Emma Davis', role: 'member' },
    { team_id: 2, email: 'frank@example.com', name: 'Frank Miller', role: 'member' },
    // Security Team (id: 3)
    { team_id: 3, email: 'grace@example.com', name: 'Grace Wilson', role: 'lead' },
    { team_id: 3, email: 'henry@example.com', name: 'Henry Taylor', role: 'member' },
    // DevOps Team (id: 4)
    { team_id: 4, email: 'ivy@example.com', name: 'Ivy Anderson', role: 'lead' },
    { team_id: 4, email: 'jack@example.com', name: 'Jack Thomas', role: 'member' },
    // QA Team (id: 5)
    { team_id: 5, email: 'kate@example.com', name: 'Kate Martinez', role: 'lead' },
    { team_id: 5, email: 'leo@example.com', name: 'Leo Garcia', role: 'member' }
  ];

  for (const item of items) {
    await query(
      `INSERT INTO team_members (team_id, email, name, role) VALUES ($1, $2, $3, $4)`,
      [item.team_id, item.email, item.name, item.role]
    );
  }
  console.log('Seeded team_members');
};

// Seed Review Assignments (at least 15)
const seedReviewAssignments = async () => {
  const items = [
    { review_id: 1, assigned_to: 'alice@example.com', assigned_by: 'admin@example.com', priority: 'high', status: 'completed', due_date: '2025-01-20' },
    { review_id: 2, assigned_to: 'bob@example.com', assigned_by: 'alice@example.com', priority: 'medium', status: 'in_progress', due_date: '2025-01-25' },
    { review_id: 3, assigned_to: 'david@example.com', assigned_by: 'admin@example.com', priority: 'low', status: 'pending', due_date: '2025-01-30' },
    { review_id: 4, assigned_to: 'emma@example.com', assigned_by: 'david@example.com', priority: 'high', status: 'pending', due_date: '2025-01-22' },
    { review_id: 5, assigned_to: 'grace@example.com', assigned_by: 'admin@example.com', priority: 'critical', status: 'in_progress', due_date: '2025-01-18' },
    { review_id: 6, assigned_to: 'henry@example.com', assigned_by: 'grace@example.com', priority: 'medium', status: 'completed', due_date: '2025-01-15' },
    { review_id: 7, assigned_to: 'ivy@example.com', assigned_by: 'admin@example.com', priority: 'low', status: 'pending', due_date: '2025-02-01' },
    { review_id: 8, assigned_to: 'jack@example.com', assigned_by: 'ivy@example.com', priority: 'medium', status: 'in_progress', due_date: '2025-01-28' },
    { review_id: 9, assigned_to: 'kate@example.com', assigned_by: 'admin@example.com', priority: 'high', status: 'completed', due_date: '2025-01-12' },
    { review_id: 10, assigned_to: 'leo@example.com', assigned_by: 'kate@example.com', priority: 'medium', status: 'pending', due_date: '2025-01-26' },
    { review_id: 11, assigned_to: 'alice@example.com', assigned_by: 'admin@example.com', priority: 'critical', status: 'in_progress', due_date: '2025-01-19' },
    { review_id: 12, assigned_to: 'carol@example.com', assigned_by: 'alice@example.com', priority: 'low', status: 'pending', due_date: '2025-02-05' },
    { review_id: 13, assigned_to: 'frank@example.com', assigned_by: 'david@example.com', priority: 'high', status: 'completed', due_date: '2025-01-10' },
    { review_id: 14, assigned_to: 'bob@example.com', assigned_by: 'admin@example.com', priority: 'medium', status: 'in_progress', due_date: '2025-01-24' },
    { review_id: 15, assigned_to: 'emma@example.com', assigned_by: 'david@example.com', priority: 'high', status: 'pending', due_date: '2025-01-27' },
    { review_id: 1, assigned_to: 'grace@example.com', assigned_by: 'admin@example.com', priority: 'critical', status: 'completed', due_date: '2025-01-08' },
    { review_id: 2, assigned_to: 'henry@example.com', assigned_by: 'grace@example.com', priority: 'low', status: 'pending', due_date: '2025-02-10' },
    { review_id: 3, assigned_to: 'kate@example.com', assigned_by: 'admin@example.com', priority: 'medium', status: 'in_progress', due_date: '2025-01-23' }
  ];

  for (const item of items) {
    await query(
      `INSERT INTO review_assignments (review_id, assigned_to, assigned_by, priority, status, due_date)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [item.review_id, item.assigned_to, item.assigned_by, item.priority, item.status, item.due_date]
    );
  }
  console.log('Seeded review_assignments');
};

// Seed Review Issues
const seedReviewIssues = async () => {
  const items = [
    // Issues for review 1
    { review_id: 1, category: 'security', severity: 'high', severity_score: 8, title: 'Potential SQL injection', description: 'User input not sanitized before database query', line_number: 15, suggestion: 'Use parameterized queries', fixed: false },
    { review_id: 1, category: 'performance', severity: 'medium', severity_score: 5, title: 'Inefficient loop', description: 'O(n²) complexity in nested loops', line_number: 28, suggestion: 'Use a Map for O(1) lookups', fixed: true },
    // Issues for review 3
    { review_id: 3, category: 'bug', severity: 'critical', severity_score: 10, title: 'Null pointer exception', description: 'Missing null check before accessing property', line_number: 42, suggestion: 'Add null check or use optional chaining', fixed: false },
    { review_id: 3, category: 'style', severity: 'low', severity_score: 2, title: 'Inconsistent naming', description: 'Variable names use different conventions', line_number: 5, suggestion: 'Use camelCase consistently', fixed: true },
    // Issues for review 5
    { review_id: 5, category: 'security', severity: 'critical', severity_score: 9, title: 'Hardcoded credentials', description: 'API key stored in source code', line_number: 8, suggestion: 'Use environment variables', fixed: false },
    { review_id: 5, category: 'maintainability', severity: 'medium', severity_score: 6, title: 'Long function', description: 'Function exceeds 50 lines', line_number: 100, suggestion: 'Extract helper functions', fixed: false },
    // Issues for review 7
    { review_id: 7, category: 'performance', severity: 'high', severity_score: 7, title: 'Memory leak', description: 'Event listener not removed on cleanup', line_number: 33, suggestion: 'Add cleanup in useEffect return', fixed: true },
    // Issues for review 9
    { review_id: 9, category: 'bug', severity: 'high', severity_score: 8, title: 'Race condition', description: 'Async operations not properly awaited', line_number: 67, suggestion: 'Use Promise.all for parallel operations', fixed: false },
    { review_id: 9, category: 'security', severity: 'medium', severity_score: 5, title: 'Missing input validation', description: 'User input not validated before processing', line_number: 12, suggestion: 'Add Joi or Zod validation schema', fixed: true },
    // Issues for review 11
    { review_id: 11, category: 'maintainability', severity: 'low', severity_score: 3, title: 'Magic numbers', description: 'Numeric literals without explanation', line_number: 45, suggestion: 'Extract to named constants', fixed: false },
    { review_id: 11, category: 'style', severity: 'info', severity_score: 1, title: 'Missing documentation', description: 'Complex function lacks JSDoc comments', line_number: 1, suggestion: 'Add JSDoc with parameter descriptions', fixed: false },
    // Issues for review 13
    { review_id: 13, category: 'performance', severity: 'high', severity_score: 7, title: 'N+1 query problem', description: 'Database queries in a loop', line_number: 89, suggestion: 'Use eager loading or batch queries', fixed: true },
    { review_id: 13, category: 'bug', severity: 'medium', severity_score: 6, title: 'Incorrect error handling', description: 'Error silently swallowed', line_number: 95, suggestion: 'Log error and re-throw or handle appropriately', fixed: false }
  ];

  for (const item of items) {
    await query(
      `INSERT INTO review_issues (review_id, category, severity, severity_score, title, description, line_number, suggestion, fixed)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [item.review_id, item.category, item.severity, item.severity_score, item.title, item.description, item.line_number, item.suggestion, item.fixed]
    );
  }
  console.log('Seeded review_issues');
};

// Seed Review Metrics (last 30 days)
const seedReviewMetrics = async () => {
  const today = new Date();
  const items = [];

  for (let i = 30; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    items.push({
      date: dateStr,
      total_reviews: Math.floor(Math.random() * 5) + 1,
      completed_reviews: Math.floor(Math.random() * 4),
      avg_severity_score: (Math.random() * 5 + 3).toFixed(2),
      issues_by_category: JSON.stringify({
        security: Math.floor(Math.random() * 5),
        performance: Math.floor(Math.random() * 8),
        bug: Math.floor(Math.random() * 6),
        style: Math.floor(Math.random() * 10),
        maintainability: Math.floor(Math.random() * 7)
      }),
      top_languages: JSON.stringify(['javascript', 'typescript', 'python'].slice(0, Math.floor(Math.random() * 3) + 1))
    });
  }

  for (const item of items) {
    await query(
      `INSERT INTO review_metrics (date, total_reviews, completed_reviews, avg_severity_score, issues_by_category, top_languages)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (date) DO UPDATE SET
         total_reviews = EXCLUDED.total_reviews,
         completed_reviews = EXCLUDED.completed_reviews`,
      [item.date, item.total_reviews, item.completed_reviews, item.avg_severity_score, item.issues_by_category, item.top_languages]
    );
  }
  console.log('Seeded review_metrics');
};

const seedRefactoringSuggestions = async () => {
  const items = [
    { title: 'Callback Hell Refactoring', description: 'Convert callbacks to async/await', original_code: 'function getData(callback) {\n  fetchUser((err, user) => {\n    if (err) return callback(err);\n    fetchOrders(user.id, (err, orders) => {\n      if (err) return callback(err);\n      fetchPayments(orders[0].id, (err, payments) => {\n        callback(null, { user, orders, payments });\n      });\n    });\n  });\n}', language: 'javascript', improvement_type: 'Async/Await', status: 'completed', refactored_code: 'async function getData() {\n  const user = await fetchUser();\n  const orders = await fetchOrders(user.id);\n  const payments = await fetchPayments(orders[0].id);\n  return { user, orders, payments };\n}', rationale: 'Async/await provides cleaner, more readable asynchronous code.' },
    { title: 'Magic Numbers Extraction', description: 'Replace magic numbers with constants', original_code: 'function calculateDiscount(price, qty) {\n  if (qty > 10) return price * 0.85;\n  if (qty > 5) return price * 0.9;\n  if (qty > 2) return price * 0.95;\n  return price;\n}', language: 'javascript', improvement_type: 'Constants', status: 'pending' },
    { title: 'Extract Method Refactoring', description: 'Break down long function', original_code: 'function processOrder(order) {\n  let total = 0;\n  for (const item of order.items) {\n    total += item.price * item.qty;\n  }\n  const tax = total * 0.1;\n  const shipping = total > 100 ? 0 : 10;\n  const discount = order.coupon ? total * 0.05 : 0;\n  return { subtotal: total, tax, shipping, discount, total: total + tax + shipping - discount };\n}', language: 'javascript', improvement_type: 'Extract Method', status: 'completed', refactored_code: 'const calculateSubtotal = (items) => items.reduce((sum, item) => sum + item.price * item.qty, 0);\nconst calculateTax = (subtotal) => subtotal * TAX_RATE;\nconst calculateShipping = (subtotal) => subtotal > FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;\nconst calculateDiscount = (subtotal, coupon) => coupon ? subtotal * COUPON_DISCOUNT : 0;\n\nfunction processOrder(order) {\n  const subtotal = calculateSubtotal(order.items);\n  return {\n    subtotal,\n    tax: calculateTax(subtotal),\n    shipping: calculateShipping(subtotal),\n    discount: calculateDiscount(subtotal, order.coupon),\n    total: subtotal + calculateTax(subtotal) + calculateShipping(subtotal) - calculateDiscount(subtotal, order.coupon)\n  };\n}', rationale: 'Smaller, focused functions are easier to test and maintain.' },
    { title: 'Replace Conditional with Polymorphism', description: 'Use strategy pattern', original_code: 'function calculateArea(shape) {\n  if (shape.type === "circle") {\n    return Math.PI * shape.radius ** 2;\n  } else if (shape.type === "rectangle") {\n    return shape.width * shape.height;\n  } else if (shape.type === "triangle") {\n    return 0.5 * shape.base * shape.height;\n  }\n}', language: 'javascript', improvement_type: 'Design Pattern', status: 'pending' },
    { title: 'Guard Clauses', description: 'Replace nested conditionals', original_code: 'function getPaymentStatus(user) {\n  if (user) {\n    if (user.subscription) {\n      if (user.subscription.active) {\n        if (user.subscription.paid) {\n          return "active";\n        } else {\n          return "pending_payment";\n        }\n      } else {\n        return "expired";\n      }\n    } else {\n      return "no_subscription";\n    }\n  } else {\n    return "no_user";\n  }\n}', language: 'javascript', improvement_type: 'Guard Clauses', status: 'completed', refactored_code: 'function getPaymentStatus(user) {\n  if (!user) return "no_user";\n  if (!user.subscription) return "no_subscription";\n  if (!user.subscription.active) return "expired";\n  if (!user.subscription.paid) return "pending_payment";\n  return "active";\n}', rationale: 'Guard clauses reduce nesting and improve readability.' },
    { title: 'Object Destructuring', description: 'Use modern destructuring', original_code: 'function displayUser(user) {\n  const name = user.name;\n  const email = user.email;\n  const age = user.age;\n  const address = user.address.street + ", " + user.address.city;\n  return name + " (" + email + ") - " + age + " years old - " + address;\n}', language: 'javascript', improvement_type: 'ES6 Syntax', status: 'pending' },
    { title: 'Replace Loop with Higher-Order Functions', description: 'Use map/filter/reduce', original_code: 'function getActiveUserEmails(users) {\n  const result = [];\n  for (let i = 0; i < users.length; i++) {\n    if (users[i].active === true) {\n      result.push(users[i].email);\n    }\n  }\n  return result;\n}', language: 'javascript', improvement_type: 'Functional', status: 'completed', refactored_code: 'const getActiveUserEmails = (users) =>\n  users\n    .filter(user => user.active)\n    .map(user => user.email);', rationale: 'Functional methods are more declarative and less error-prone.' },
    { title: 'Null Object Pattern', description: 'Handle null cases elegantly', original_code: 'function getDiscount(customer) {\n  if (customer !== null && customer !== undefined) {\n    if (customer.membership !== null) {\n      if (customer.membership.level === "gold") {\n        return 0.2;\n      }\n    }\n  }\n  return 0;\n}', language: 'javascript', improvement_type: 'Design Pattern', status: 'pending' },
    { title: 'Template Literals', description: 'Replace string concatenation', original_code: 'function buildUrl(base, path, params) {\n  let url = base + "/" + path + "?";\n  const keys = Object.keys(params);\n  for (let i = 0; i < keys.length; i++) {\n    url += keys[i] + "=" + params[keys[i]];\n    if (i < keys.length - 1) url += "&";\n  }\n  return url;\n}', language: 'javascript', improvement_type: 'ES6 Syntax', status: 'completed', refactored_code: 'const buildUrl = (base, path, params) => {\n  const queryString = Object.entries(params)\n    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)\n    .join("&");\n  return `${base}/${path}?${queryString}`;\n};', rationale: 'Template literals and modern methods are cleaner and less error-prone.' },
    { title: 'Extract Configuration', description: 'Move hardcoded values to config', original_code: 'async function sendEmail(to, subject, body) {\n  const transporter = nodemailer.createTransport({\n    host: "smtp.gmail.com",\n    port: 587,\n    auth: {\n      user: "myapp@gmail.com",\n      pass: "supersecret123"\n    }\n  });\n  await transporter.sendMail({ from: "myapp@gmail.com", to, subject, html: body });\n}', language: 'javascript', improvement_type: 'Configuration', status: 'pending' },
    { title: 'Compose Functions', description: 'Use function composition', original_code: 'function processData(data) {\n  const validated = validate(data);\n  const normalized = normalize(validated);\n  const transformed = transform(normalized);\n  const formatted = format(transformed);\n  return formatted;\n}', language: 'javascript', improvement_type: 'Functional', status: 'completed', refactored_code: 'const pipe = (...fns) => (x) => fns.reduce((v, f) => f(v), x);\n\nconst processData = pipe(\n  validate,\n  normalize,\n  transform,\n  format\n);', rationale: 'Function composition creates a clear data transformation pipeline.' },
    { title: 'Replace Temp with Query', description: 'Extract expressions to methods', original_code: 'function getPrice(order) {\n  const basePrice = order.quantity * order.itemPrice;\n  const quantityDiscount = Math.max(0, order.quantity - 500) * order.itemPrice * 0.05;\n  const shipping = Math.min(basePrice * 0.1, 100);\n  return basePrice - quantityDiscount + shipping;\n}', language: 'javascript', improvement_type: 'Extract Method', status: 'pending' },
    { title: 'Introduce Parameter Object', description: 'Group related parameters', original_code: 'function createUser(firstName, lastName, email, street, city, zip, country, phone, birthDate) {\n  return {\n    name: firstName + " " + lastName,\n    email,\n    address: { street, city, zip, country },\n    phone,\n    birthDate\n  };\n}', language: 'javascript', improvement_type: 'Parameter Object', status: 'completed', refactored_code: 'function createUser({ name, email, address, phone, birthDate }) {\n  return {\n    name: `${name.first} ${name.last}`,\n    email,\n    address,\n    phone,\n    birthDate\n  };\n}\n\n// Usage:\ncreateUser({\n  name: { first: "John", last: "Doe" },\n  email: "john@example.com",\n  address: { street: "123 Main", city: "NYC", zip: "10001", country: "USA" },\n  phone: "555-1234",\n  birthDate: "1990-01-01"\n});', rationale: 'Parameter objects improve readability and make the API more flexible.' },
    { title: 'Replace Error Code with Exception', description: 'Use proper error handling', original_code: 'function withdraw(account, amount) {\n  if (amount <= 0) return -1;\n  if (account.balance < amount) return -2;\n  account.balance -= amount;\n  return 0;\n}', language: 'javascript', improvement_type: 'Error Handling', status: 'pending' },
    { title: 'Remove Duplicate Code', description: 'DRY principle application', original_code: 'function validateEmail(email) {\n  if (!email) return { valid: false, error: "Email required" };\n  if (!email.includes("@")) return { valid: false, error: "Invalid email" };\n  return { valid: true };\n}\n\nfunction validateUsername(username) {\n  if (!username) return { valid: false, error: "Username required" };\n  if (username.length < 3) return { valid: false, error: "Too short" };\n  return { valid: true };\n}', language: 'javascript', improvement_type: 'DRY', status: 'completed', refactored_code: 'const createValidator = (rules) => (value, fieldName) => {\n  for (const rule of rules) {\n    const error = rule(value, fieldName);\n    if (error) return { valid: false, error };\n  }\n  return { valid: true };\n};\n\nconst required = (value, field) => !value && `${field} required`;\nconst minLength = (min) => (value, field) => value?.length < min && `${field} too short`;\nconst isEmail = (value) => !value?.includes("@") && "Invalid email";\n\nconst validateEmail = createValidator([required, isEmail]);\nconst validateUsername = createValidator([required, minLength(3)]);', rationale: 'Reusable validator factory eliminates duplication and is extensible.' }
  ];

  for (const item of items) {
    await query(
      `INSERT INTO refactoring_suggestions (title, description, original_code, language, improvement_type, status, refactored_code, rationale)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [item.title, item.description, item.original_code, item.language, item.improvement_type, item.status, item.refactored_code || null, item.rationale || null]
    );
  }
  console.log('Seeded refactoring_suggestions');
};

// Seed Bug Predictions
const seedBugPredictions = async () => {
  const items = [
    { title: 'Async Race Condition', description: 'Potential race condition in async code', code_snippet: 'let data = null;\nasync function fetchData() {\n  data = await api.get();\n}\nfunction processData() {\n  return data.map(item => item.value);\n}', language: 'javascript', status: 'completed', bug_probability: 85, ai_analysis: 'High probability of null reference error due to race condition.' },
    { title: 'Memory Leak in Event Listener', description: 'Potential memory leak from unremoved listener', code_snippet: 'function setupListener() {\n  window.addEventListener("scroll", handleScroll);\n}\ncomponentDidMount() {\n  setupListener();\n}', language: 'javascript', status: 'pending' },
    { title: 'Integer Overflow Risk', description: 'Potential integer overflow in calculations', code_snippet: 'function calculateTotal(items) {\n  let total = 0;\n  for (const item of items) {\n    total += item.price * item.quantity;\n  }\n  return total;\n}', language: 'javascript', status: 'completed', bug_probability: 45, ai_analysis: 'Medium risk of overflow with large datasets.' },
    { title: 'SQL Injection Vulnerability', description: 'User input directly in query', code_snippet: 'const getUser = (id) => {\n  return db.query(`SELECT * FROM users WHERE id = ${id}`);\n};', language: 'javascript', status: 'completed', bug_probability: 95, ai_analysis: 'Critical SQL injection vulnerability detected.' },
    { title: 'Null Pointer Exception', description: 'Missing null check before access', code_snippet: 'function getUserName(user) {\n  return user.profile.name.first;\n}', language: 'javascript', status: 'pending' },
    { title: 'Infinite Loop Risk', description: 'Loop condition may never be false', code_snippet: 'while (items.length > 0) {\n  processItem(items[0]);\n  // Missing: items.shift();\n}', language: 'javascript', status: 'completed', bug_probability: 90, ai_analysis: 'Very high probability of infinite loop.' },
    { title: 'Type Coercion Bug', description: 'Implicit type coercion issue', code_snippet: 'function isEqual(a, b) {\n  return a == b;\n}', language: 'javascript', status: 'pending' },
    { title: 'Closure Variable Capture', description: 'Loop variable captured incorrectly', code_snippet: 'for (var i = 0; i < 5; i++) {\n  setTimeout(() => console.log(i), 100);\n}', language: 'javascript', status: 'completed', bug_probability: 80, ai_analysis: 'Classic closure bug - all callbacks will log 5.' },
    { title: 'Unhandled Promise Rejection', description: 'Missing error handling in async', code_snippet: 'async function fetchUser(id) {\n  const response = await fetch(`/api/users/${id}`);\n  return response.json();\n}', language: 'javascript', status: 'pending' },
    { title: 'State Mutation Bug', description: 'Direct state mutation in React', code_snippet: 'function addItem(item) {\n  this.state.items.push(item);\n  this.setState({ items: this.state.items });\n}', language: 'javascript', status: 'completed', bug_probability: 75, ai_analysis: 'Direct state mutation can cause rendering issues.' },
    { title: 'Off-by-One Error', description: 'Array boundary issue', code_snippet: 'for (let i = 0; i <= array.length; i++) {\n  console.log(array[i]);\n}', language: 'javascript', status: 'completed', bug_probability: 70, ai_analysis: 'Off-by-one error will cause undefined access.' },
    { title: 'Async/Await Missing', description: 'Promise not awaited', code_snippet: 'function saveData(data) {\n  const result = database.save(data);\n  console.log("Saved:", result);\n}', language: 'javascript', status: 'pending' },
    { title: 'Division by Zero', description: 'No check for zero divisor', code_snippet: 'function calculateAverage(total, count) {\n  return total / count;\n}', language: 'javascript', status: 'completed', bug_probability: 60, ai_analysis: 'Risk of division by zero when count is 0.' },
    { title: 'Regex Denial of Service', description: 'Vulnerable regex pattern', code_snippet: 'const emailRegex = /^([a-zA-Z0-9]+)+@[a-zA-Z]+$/;\nfunction validateEmail(email) {\n  return emailRegex.test(email);\n}', language: 'javascript', status: 'pending' },
    { title: 'Cross-Site Scripting Risk', description: 'Unescaped HTML rendering', code_snippet: 'function renderComment(comment) {\n  document.getElementById("comments").innerHTML += comment.text;\n}', language: 'javascript', status: 'completed', bug_probability: 92, ai_analysis: 'High XSS risk from unescaped user content.' }
  ];

  for (const item of items) {
    await query(
      `INSERT INTO bug_predictions (title, description, code_snippet, language, status, bug_probability, ai_analysis)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [item.title, item.description, item.code_snippet, item.language, item.status, item.bug_probability || null, item.ai_analysis || null]
    );
  }
  console.log('Seeded bug_predictions');
};

// Seed Code Explanations
const seedCodeExplanations = async () => {
  const items = [
    { title: 'Kubernetes Deployment Config', description: 'K8s deployment with replicas', code_snippet: 'apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: nginx-deployment\nspec:\n  replicas: 3\n  selector:\n    matchLabels:\n      app: nginx\n  template:\n    spec:\n      containers:\n      - name: nginx\n        image: nginx:1.14.2\n        ports:\n        - containerPort: 80', language: 'yaml', context: 'kubernetes', status: 'completed', complexity_level: 'intermediate', ai_analysis: 'This deployment creates 3 replicas of nginx.' },
    { title: 'Docker Multi-stage Build', description: 'Optimized container build', code_snippet: 'FROM node:18 AS builder\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\n\nFROM node:18-alpine\nWORKDIR /app\nCOPY --from=builder /app/dist ./dist\nCMD ["node", "dist/index.js"]', language: 'dockerfile', context: 'devops', status: 'pending' },
    { title: 'Terraform AWS VPC', description: 'VPC infrastructure setup', code_snippet: 'resource "aws_vpc" "main" {\n  cidr_block = "10.0.0.0/16"\n  enable_dns_hostnames = true\n  tags = {\n    Name = "main-vpc"\n  }\n}', language: 'terraform', context: 'infrastructure', status: 'completed', complexity_level: 'beginner', ai_analysis: 'Creates a VPC with DNS support.' },
    { title: 'GitHub Actions CI/CD', description: 'Automated deployment pipeline', code_snippet: 'name: CI/CD\non: [push]\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v2\n      - run: npm ci\n      - run: npm test\n      - run: npm run build', language: 'yaml', context: 'ci-cd', status: 'pending' },
    { title: 'Ansible Playbook', description: 'Server configuration', code_snippet: '- hosts: webservers\n  become: yes\n  tasks:\n    - name: Install nginx\n      apt:\n        name: nginx\n        state: present\n    - name: Start nginx\n      service:\n        name: nginx\n        state: started', language: 'ansible', context: 'infrastructure', status: 'completed', complexity_level: 'intermediate' },
    { title: 'Prometheus Alert Rules', description: 'Monitoring alert configuration', code_snippet: 'groups:\n- name: example\n  rules:\n  - alert: HighMemoryUsage\n    expr: node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes * 100 < 10\n    for: 5m\n    labels:\n      severity: critical', language: 'yaml', context: 'monitoring', status: 'pending' },
    { title: 'Bash Deployment Script', description: 'Shell deployment automation', code_snippet: '#!/bin/bash\nset -e\necho "Deploying to production..."\ngit pull origin main\nnpm ci --production\npm2 reload all\necho "Deployment complete!"', language: 'bash', context: 'devops', status: 'completed', complexity_level: 'beginner' },
    { title: 'Nginx Reverse Proxy', description: 'Load balancer configuration', code_snippet: 'upstream backend {\n    server 127.0.0.1:3001;\n    server 127.0.0.1:3002;\n}\nserver {\n    listen 80;\n    location / {\n        proxy_pass http://backend;\n        proxy_set_header Host $host;\n    }\n}', language: 'nginx', context: 'infrastructure', status: 'pending' },
    { title: 'AWS CloudFormation Stack', description: 'Infrastructure as code', code_snippet: 'AWSTemplateFormatVersion: "2010-09-09"\nResources:\n  MyEC2Instance:\n    Type: AWS::EC2::Instance\n    Properties:\n      InstanceType: t2.micro\n      ImageId: ami-0c55b159cbfafe1f0', language: 'yaml', context: 'infrastructure', status: 'completed', complexity_level: 'intermediate' },
    { title: 'Helm Chart Values', description: 'Kubernetes package config', code_snippet: 'replicaCount: 3\nimage:\n  repository: myapp\n  tag: latest\nservice:\n  type: ClusterIP\n  port: 80\ningress:\n  enabled: true\n  hosts:\n    - myapp.example.com', language: 'yaml', context: 'kubernetes', status: 'pending' },
    { title: 'Jenkins Pipeline', description: 'CI/CD pipeline definition', code_snippet: 'pipeline {\n    agent any\n    stages {\n        stage("Build") {\n            steps {\n                sh "npm install"\n                sh "npm run build"\n            }\n        }\n        stage("Deploy") {\n            steps {\n                sh "kubectl apply -f k8s/"\n            }\n        }\n    }\n}', language: 'groovy', context: 'ci-cd', status: 'completed', complexity_level: 'intermediate' },
    { title: 'Grafana Dashboard JSON', description: 'Monitoring dashboard config', code_snippet: '{\n  "title": "System Metrics",\n  "panels": [\n    {\n      "title": "CPU Usage",\n      "type": "graph",\n      "targets": [{\n        "expr": "rate(cpu_usage[5m])"\n      }]\n    }\n  ]\n}', language: 'json', context: 'monitoring', status: 'pending' },
    { title: 'Docker Compose Stack', description: 'Multi-container application', code_snippet: 'version: "3.8"\nservices:\n  web:\n    build: .\n    ports:\n      - "3000:3000"\n  db:\n    image: postgres:13\n    environment:\n      POSTGRES_PASSWORD: secret', language: 'yaml', context: 'devops', status: 'completed', complexity_level: 'beginner' },
    { title: 'Istio Virtual Service', description: 'Service mesh routing', code_snippet: 'apiVersion: networking.istio.io/v1alpha3\nkind: VirtualService\nmetadata:\n  name: reviews\nspec:\n  hosts:\n  - reviews\n  http:\n  - route:\n    - destination:\n        host: reviews\n        subset: v1', language: 'yaml', context: 'kubernetes', status: 'pending' },
    { title: 'Vault Secret Config', description: 'Secrets management', code_snippet: 'path "secret/data/*" {\n  capabilities = ["create", "read", "update", "delete", "list"]\n}\npath "secret/metadata/*" {\n  capabilities = ["list"]\n}', language: 'hcl', context: 'security', status: 'completed', complexity_level: 'advanced' }
  ];

  for (const item of items) {
    await query(
      `INSERT INTO code_explanations (title, description, code_snippet, language, context, status, complexity_level, ai_analysis)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [item.title, item.description, item.code_snippet, item.language, item.context, item.status, item.complexity_level || null, item.ai_analysis || null]
    );
  }
  console.log('Seeded code_explanations');
};

// Seed Tech Debt Items
const seedTechDebtItems = async () => {
  const items = [
    { title: 'Legacy Authentication System', description: 'Old auth system needs modernization', code_snippet: 'function authenticate(user, pass) {\n  const hash = md5(pass);\n  return db.query(`SELECT * FROM users WHERE password = "${hash}"`);\n}', language: 'javascript', project_name: 'Main API', debt_type: 'security', severity: 'critical', status: 'completed', priority_score: 95, ai_analysis: 'Critical: MD5 is insecure, SQL injection risk.' },
    { title: 'Monolithic Service', description: 'Single service handling too much', code_snippet: 'class MainService {\n  handleUsers() {}\n  handleOrders() {}\n  handlePayments() {}\n  handleNotifications() {}\n  handleReports() {}\n}', language: 'javascript', project_name: 'Backend', debt_type: 'design', severity: 'high', status: 'pending' },
    { title: 'No Test Coverage', description: 'Critical module lacks tests', code_snippet: 'export function processPayment(order) {\n  // 500 lines of untested payment logic\n}', language: 'javascript', project_name: 'Payment Service', debt_type: 'test', severity: 'high', status: 'completed', priority_score: 85, ai_analysis: 'High risk without test coverage.' },
    { title: 'Hardcoded Configuration', description: 'Config values in source code', code_snippet: 'const API_URL = "http://production-server.com";\nconst DB_PASSWORD = "secret123";\nconst API_KEY = "sk-1234567890";', language: 'javascript', project_name: 'Web App', debt_type: 'infrastructure', severity: 'critical', status: 'pending' },
    { title: 'Outdated Dependencies', description: 'Many packages years old', code_snippet: '{\n  "dependencies": {\n    "express": "3.0.0",\n    "lodash": "2.0.0",\n    "moment": "1.0.0"\n  }\n}', language: 'json', project_name: 'API Gateway', debt_type: 'infrastructure', severity: 'high', status: 'completed', priority_score: 78 },
    { title: 'Duplicate Code Blocks', description: 'Same logic copied multiple times', code_snippet: '// In file1.js\nfunction validateEmail(email) {\n  return /^[^@]+@[^@]+$/.test(email);\n}\n// Same in file2.js, file3.js, file4.js', language: 'javascript', project_name: 'Frontend', debt_type: 'code', severity: 'medium', status: 'pending' },
    { title: 'Missing Documentation', description: 'No API documentation', code_snippet: '// No comments or documentation\napp.post("/api/v1/complex-endpoint", complexHandler);', language: 'javascript', project_name: 'API', debt_type: 'documentation', severity: 'medium', status: 'completed', priority_score: 60 },
    { title: 'God Object Anti-pattern', description: 'Class with too many responsibilities', code_snippet: 'class Application {\n  // 2000+ lines handling everything\n  users; orders; payments; notifications;\n  // 50+ methods\n}', language: 'javascript', project_name: 'Core', debt_type: 'design', severity: 'high', status: 'pending' },
    { title: 'Callback Hell', description: 'Deeply nested callbacks', code_snippet: 'getData(function(a) {\n  getMoreData(a, function(b) {\n    getEvenMoreData(b, function(c) {\n      processData(c, function(d) {\n        saveData(d, function(e) {});\n      });\n    });\n  });\n});', language: 'javascript', project_name: 'Data Pipeline', debt_type: 'code', severity: 'medium', status: 'completed', priority_score: 55 },
    { title: 'No Error Handling', description: 'Missing error boundaries', code_snippet: 'async function processOrder(order) {\n  const payment = await chargeCard(order);\n  const shipping = await createShipment(order);\n  await sendConfirmation(order);\n}', language: 'javascript', project_name: 'Order Service', debt_type: 'code', severity: 'high', status: 'pending' },
    { title: 'Mixed Concerns in Components', description: 'UI and business logic combined', code_snippet: 'function OrderForm() {\n  const [order, setOrder] = useState({});\n  // 200 lines of business logic\n  // 100 lines of API calls\n  // 150 lines of JSX\n}', language: 'javascript', project_name: 'Frontend', debt_type: 'design', severity: 'medium', status: 'completed', priority_score: 50 },
    { title: 'Inefficient Database Queries', description: 'N+1 query problem', code_snippet: 'const users = await User.findAll();\nfor (const user of users) {\n  user.orders = await Order.findAll({ userId: user.id });\n}', language: 'javascript', project_name: 'API', debt_type: 'performance', severity: 'high', status: 'pending' },
    { title: 'Inconsistent Coding Style', description: 'No linting or formatting', code_snippet: 'function getData(){\nreturn fetch(url)\n.then(r=>r.json())\n}\n\nconst  getData2 = async () => {\n    const response = await fetch( url )\n    return response.json()\n}', language: 'javascript', project_name: 'Shared Lib', debt_type: 'code', severity: 'low', status: 'completed', priority_score: 35 },
    { title: 'Deprecated API Usage', description: 'Using sunset APIs', code_snippet: 'import { __SECRET_INTERNALS_DO_NOT_USE } from "react";\nimport { unstable_batchedUpdates } from "react-dom";', language: 'javascript', project_name: 'Frontend', debt_type: 'infrastructure', severity: 'medium', status: 'pending' },
    { title: 'No Logging Infrastructure', description: 'Console.log everywhere', code_snippet: 'function processPayment(payment) {\n  console.log("Processing payment", payment);\n  // ...\n  console.log("Payment done");\n}', language: 'javascript', project_name: 'All Services', debt_type: 'infrastructure', severity: 'medium', status: 'completed', priority_score: 45 }
  ];

  for (const item of items) {
    await query(
      `INSERT INTO tech_debt_items (title, description, code_snippet, language, project_name, debt_type, severity, status, priority_score, ai_analysis)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [item.title, item.description, item.code_snippet, item.language, item.project_name, item.debt_type, item.severity || null, item.status, item.priority_score || null, item.ai_analysis || null]
    );
  }
  console.log('Seeded tech_debt_items');
};

// Seed Architecture Reviews
const seedArchitectureReviews = async () => {
  const items = [
    { title: 'E-Commerce Platform', description: 'Large scale e-commerce system', architecture_diagram: 'Frontend (React) -> API Gateway -> Microservices (User, Product, Order, Payment) -> PostgreSQL + Redis + Elasticsearch', tech_stack: 'React, Node.js, PostgreSQL, Redis, Elasticsearch, Docker, Kubernetes', system_type: 'microservices', status: 'completed', scalability_score: 85, maintainability_score: 78, security_score: 72 },
    { title: 'Real-time Chat Application', description: 'Scalable messaging platform', architecture_diagram: 'Mobile/Web Clients -> WebSocket Server -> Redis Pub/Sub -> MongoDB\nPresence Service -> Redis\nNotification Service -> Firebase', tech_stack: 'React Native, Node.js, Socket.io, Redis, MongoDB, Firebase', system_type: 'event-driven', status: 'pending' },
    { title: 'Data Analytics Pipeline', description: 'Big data processing system', architecture_diagram: 'Data Sources -> Kafka -> Spark Streaming -> Data Lake (S3)\nBatch Processing -> Spark -> Data Warehouse (Redshift)\nBI Tools -> Metabase', tech_stack: 'Apache Kafka, Spark, S3, Redshift, Python, Airflow', system_type: 'event-driven', status: 'completed', scalability_score: 92, maintainability_score: 65, security_score: 80 },
    { title: 'Content Management System', description: 'Headless CMS architecture', architecture_diagram: 'Admin Panel -> GraphQL API -> PostgreSQL\nCDN -> Static Site Generator -> Content API', tech_stack: 'Next.js, GraphQL, PostgreSQL, Cloudflare, Vercel', system_type: 'serverless', status: 'pending' },
    { title: 'IoT Device Management', description: 'IoT platform architecture', architecture_diagram: 'IoT Devices -> MQTT Broker -> Message Processor -> TimescaleDB\nDevice Registry -> PostgreSQL\nDashboard -> Grafana', tech_stack: 'MQTT, Node.js, TimescaleDB, PostgreSQL, Grafana, Docker', system_type: 'event-driven', status: 'completed', scalability_score: 88, maintainability_score: 70, security_score: 75 },
    { title: 'Banking Application', description: 'Core banking system', architecture_diagram: 'Mobile App -> API Gateway (Kong) -> Core Banking Services\nTransaction Service -> Event Store -> CQRS Read Models\nAll services -> PostgreSQL (Primary) + Read Replicas', tech_stack: 'Java, Spring Boot, PostgreSQL, Kafka, Kong, Kubernetes', system_type: 'microservices', status: 'pending' },
    { title: 'Social Media Platform', description: 'User-generated content platform', architecture_diagram: 'Web/Mobile -> CDN -> Load Balancer -> API Servers\nFeed Service -> Redis + Cassandra\nMedia Service -> S3 + CloudFront\nSearch -> Elasticsearch', tech_stack: 'React, Node.js, Cassandra, Redis, Elasticsearch, S3', system_type: 'microservices', status: 'completed', scalability_score: 90, maintainability_score: 68, security_score: 70 },
    { title: 'Healthcare Platform', description: 'HIPAA compliant health system', architecture_diagram: 'Patient Portal -> API Gateway -> Auth Service (OAuth2)\nEHR Service -> Encrypted PostgreSQL\nAudit Service -> Immutable Log Storage\nAll traffic through VPN', tech_stack: 'React, .NET Core, PostgreSQL, Azure, Auth0', system_type: 'modular-monolith', status: 'pending' },
    { title: 'Gaming Backend', description: 'Multiplayer game server', architecture_diagram: 'Game Clients -> Regional Edge Servers -> Central Game State\nMatchmaking -> Redis Cluster\nPlayer Data -> Distributed Cache + PostgreSQL\nLeaderboards -> Redis Sorted Sets', tech_stack: 'Go, Redis, PostgreSQL, WebSocket, Kubernetes', system_type: 'event-driven', status: 'completed', scalability_score: 95, maintainability_score: 72, security_score: 78 },
    { title: 'Video Streaming Service', description: 'VOD streaming platform', architecture_diagram: 'Upload Service -> Transcoding Queue -> FFmpeg Workers\nCDN Edge Servers -> Origin Server\nMetadata Service -> PostgreSQL\nRecommendations -> ML Pipeline', tech_stack: 'Node.js, FFmpeg, S3, CloudFront, PostgreSQL, TensorFlow', system_type: 'microservices', status: 'pending' },
    { title: 'Enterprise ERP', description: 'Large enterprise resource planning', architecture_diagram: 'Web Portal -> API Layer -> Domain Services (HR, Finance, Inventory)\nIntegration Bus -> External Systems\nReporting -> Data Warehouse\nAll modules -> Shared PostgreSQL', tech_stack: 'Angular, Java, Spring, PostgreSQL, RabbitMQ, Jasper', system_type: 'modular-monolith', status: 'completed', scalability_score: 65, maintainability_score: 80, security_score: 85 },
    { title: 'Ride-sharing Platform', description: 'On-demand transportation', architecture_diagram: 'Mobile Apps -> API Gateway -> Driver/Rider Services\nMatching Engine -> Geospatial Index (PostGIS)\nPricing Service -> ML Model\nReal-time Tracking -> Redis Geospatial', tech_stack: 'React Native, Go, PostgreSQL, PostGIS, Redis, Kafka', system_type: 'microservices', status: 'pending' },
    { title: 'CI/CD Platform', description: 'Build and deployment system', architecture_diagram: 'GitHub Webhook -> Build Scheduler -> Worker Nodes (K8s)\nArtifact Storage -> S3\nDeployment Engine -> Kubernetes API\nDashboard -> Build Status + Logs', tech_stack: 'Go, Kubernetes, S3, PostgreSQL, React', system_type: 'event-driven', status: 'completed', scalability_score: 87, maintainability_score: 82, security_score: 80 },
    { title: 'Newsletter Platform', description: 'Email marketing system', architecture_diagram: 'Editor UI -> Content API -> PostgreSQL\nScheduler -> Email Queue -> SMTP Workers\nTracking Pixel -> Analytics Pipeline\nUnsubscribe Service', tech_stack: 'Vue.js, Node.js, PostgreSQL, Redis, SendGrid', system_type: 'serverless', status: 'pending' },
    { title: 'Inventory Management', description: 'Warehouse management system', architecture_diagram: 'Warehouse Apps -> Central API -> PostgreSQL\nBarcode Scanners -> Real-time Updates\nReporting Dashboard -> Read Replicas\nIntegration with ERP/Shipping', tech_stack: 'React, Node.js, PostgreSQL, Redis, REST APIs', system_type: 'monolithic', status: 'completed', scalability_score: 70, maintainability_score: 85, security_score: 75 }
  ];

  for (const item of items) {
    await query(
      `INSERT INTO architecture_reviews (title, description, architecture_diagram, tech_stack, system_type, status, scalability_score, maintainability_score, security_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [item.title, item.description, item.architecture_diagram, item.tech_stack, item.system_type, item.status, item.scalability_score || null, item.maintainability_score || null, item.security_score || null]
    );
  }
  console.log('Seeded architecture_reviews');
};

// Seed Dependency Audits
const seedDependencyAudits = async () => {
  const items = [
    { title: 'React Frontend Dependencies', description: 'Main frontend project', dependencies_list: '{\n  "react": "17.0.2",\n  "react-dom": "17.0.2",\n  "axios": "0.21.1",\n  "lodash": "4.17.20",\n  "moment": "2.29.1"\n}', package_manager: 'npm', project_type: 'web-frontend', status: 'completed', risk_score: 45, ai_analysis: 'Moderate risk: axios has known vulnerabilities, moment is deprecated.' },
    { title: 'Node.js API Dependencies', description: 'Backend API service', dependencies_list: '{\n  "express": "4.17.1",\n  "jsonwebtoken": "8.5.1",\n  "bcrypt": "5.0.1",\n  "pg": "8.7.1",\n  "cors": "2.8.5"\n}', package_manager: 'npm', project_type: 'api', status: 'pending' },
    { title: 'Python ML Pipeline', description: 'Machine learning service', dependencies_list: 'numpy==1.19.5\npandas==1.2.0\nscikit-learn==0.24.0\ntensorflow==2.4.0\nrequests==2.25.1', package_manager: 'pip', project_type: 'microservice', status: 'completed', risk_score: 60, ai_analysis: 'High risk: older tensorflow version with security issues.' },
    { title: 'Go Microservice', description: 'Auth service dependencies', dependencies_list: 'module auth-service\n\ngo 1.17\n\nrequire (\n  github.com/gin-gonic/gin v1.7.4\n  github.com/golang-jwt/jwt v3.2.2\n  github.com/go-redis/redis v8.11.3\n)', package_manager: 'go', project_type: 'microservice', status: 'pending' },
    { title: 'Java Spring Application', description: 'Enterprise backend', dependencies_list: '<dependencies>\n  <dependency>\n    <groupId>org.springframework.boot</groupId>\n    <artifactId>spring-boot-starter-web</artifactId>\n    <version>2.5.0</version>\n  </dependency>\n  <dependency>\n    <groupId>log4j</groupId>\n    <artifactId>log4j</artifactId>\n    <version>1.2.17</version>\n  </dependency>\n</dependencies>', package_manager: 'maven', project_type: 'api', status: 'completed', risk_score: 95, ai_analysis: 'Critical: log4j 1.x has severe vulnerabilities (Log4Shell).' },
    { title: 'Ruby on Rails API', description: 'Legacy Rails application', dependencies_list: 'gem "rails", "5.2.6"\ngem "pg", "1.2.3"\ngem "devise", "4.7.3"\ngem "puma", "4.3.8"\ngem "rack", "2.2.3"', package_manager: 'bundler', project_type: 'api', status: 'pending' },
    { title: 'PHP Laravel Backend', description: 'E-commerce backend', dependencies_list: '{\n  "laravel/framework": "8.0",\n  "guzzlehttp/guzzle": "7.2",\n  "stripe/stripe-php": "7.75"\n}', package_manager: 'composer', project_type: 'web-backend', status: 'completed', risk_score: 35, ai_analysis: 'Low risk: dependencies are relatively up to date.' },
    { title: 'Rust CLI Tool', description: 'Internal CLI utility', dependencies_list: '[dependencies]\nclap = "3.0"\nserde = { version = "1.0", features = ["derive"] }\nreqwest = { version = "0.11", features = ["json"] }\ntokio = { version = "1", features = ["full"] }', package_manager: 'cargo', project_type: 'cli', status: 'pending' },
    { title: 'Vue.js Dashboard', description: 'Admin dashboard frontend', dependencies_list: '{\n  "vue": "2.6.14",\n  "vuex": "3.6.2",\n  "vue-router": "3.5.3",\n  "chart.js": "2.9.4",\n  "bootstrap-vue": "2.21.2"\n}', package_manager: 'npm', project_type: 'web-frontend', status: 'completed', risk_score: 55, ai_analysis: 'Medium risk: Vue 2 approaching EOL, chart.js outdated.' },
    { title: 'Android App Dependencies', description: 'Mobile Android app', dependencies_list: 'dependencies {\n  implementation "androidx.core:core-ktx:1.6.0"\n  implementation "com.squareup.retrofit2:retrofit:2.9.0"\n  implementation "com.google.code.gson:gson:2.8.8"\n}', package_manager: 'gradle', project_type: 'mobile', status: 'pending' },
    { title: 'Angular Enterprise App', description: 'Large Angular application', dependencies_list: '{\n  "@angular/core": "11.2.0",\n  "@angular/common": "11.2.0",\n  "rxjs": "6.6.0",\n  "@ngrx/store": "11.0.0",\n  "lodash-es": "4.17.20"\n}', package_manager: 'npm', project_type: 'web-frontend', status: 'completed', risk_score: 50, ai_analysis: 'Medium risk: Angular 11 needs upgrade, lodash vulnerable version.' },
    { title: 'Django REST API', description: 'Python API service', dependencies_list: 'Django==3.2\ndjango-rest-framework==3.12.4\ncelery==5.1.2\nredis==3.5.3\ngunicorn==20.1.0', package_manager: 'pip', project_type: 'api', status: 'pending' },
    { title: 'Next.js SSR Application', description: 'Server-rendered React app', dependencies_list: '{\n  "next": "11.1.0",\n  "react": "17.0.2",\n  "swr": "1.0.0",\n  "tailwindcss": "2.2.0",\n  "prisma": "3.0.0"\n}', package_manager: 'npm', project_type: 'web-frontend', status: 'completed', risk_score: 30, ai_analysis: 'Low risk: dependencies are recent but not latest.' },
    { title: 'NestJS Microservice', description: 'TypeScript backend service', dependencies_list: '{\n  "@nestjs/core": "8.0.0",\n  "@nestjs/common": "8.0.0",\n  "typeorm": "0.2.37",\n  "class-validator": "0.13.1",\n  "rxjs": "7.3.0"\n}', package_manager: 'npm', project_type: 'microservice', status: 'pending' },
    { title: 'Electron Desktop App', description: 'Cross-platform desktop app', dependencies_list: '{\n  "electron": "13.0.0",\n  "electron-builder": "22.11.0",\n  "react": "17.0.2",\n  "sqlite3": "5.0.2"\n}', package_manager: 'npm', project_type: 'desktop', status: 'completed', risk_score: 65, ai_analysis: 'High risk: Electron 13 has multiple security vulnerabilities.' }
  ];

  for (const item of items) {
    await query(
      `INSERT INTO dependency_audits (title, description, dependencies_list, package_manager, project_type, status, risk_score, ai_analysis)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [item.title, item.description, item.dependencies_list, item.package_manager, item.project_type, item.status, item.risk_score || null, item.ai_analysis || null]
    );
  }
  console.log('Seeded dependency_audits');
};

// Seed Deployment Advices
const seedDeploymentAdvices = async () => {
  const items = [
    { title: 'Production API Deployment', description: 'First production deployment', current_setup: 'Node.js Express API\nPostgreSQL database\nRedis cache\nCurrently running on single EC2 instance', target_environment: 'aws', deployment_type: 'initial', status: 'completed', deployment_strategy: 'Blue-Green deployment with ALB' },
    { title: 'Kubernetes Migration', description: 'Moving from VMs to K8s', current_setup: 'Docker containers on EC2\nManual scaling\nNginx load balancer', target_environment: 'kubernetes', deployment_type: 'migration', status: 'pending' },
    { title: 'Serverless Function Deploy', description: 'Lambda function deployment', current_setup: 'Python script for data processing\nS3 triggers needed\nDynamoDB for storage', target_environment: 'aws', deployment_type: 'initial', status: 'completed', deployment_strategy: 'SAM/CloudFormation with canary deployment' },
    { title: 'Frontend to Vercel', description: 'Static site deployment', current_setup: 'Next.js application\nCurrently on custom server\nNeeds preview deployments', target_environment: 'vercel', deployment_type: 'migration', status: 'pending' },
    { title: 'Database Scaling Deployment', description: 'Add read replicas', current_setup: 'Single PostgreSQL instance\n500GB data\nHigh read traffic', target_environment: 'aws', deployment_type: 'scaling', status: 'completed', deployment_strategy: 'Add 2 read replicas with connection pooling' },
    { title: 'Multi-region Deployment', description: 'Global availability', current_setup: 'Single region US-East\nGlobal user base\n99.9% SLA required', target_environment: 'aws', deployment_type: 'scaling', status: 'pending' },
    { title: 'Rollback Production Release', description: 'Critical bug found', current_setup: 'Version 2.5.0 deployed\nPayment processing broken\nNeed immediate rollback to 2.4.9', target_environment: 'kubernetes', deployment_type: 'rollback', status: 'completed', deployment_strategy: 'Immediate kubectl rollout undo' },
    { title: 'GCP App Engine Deploy', description: 'New microservice', current_setup: 'Go API service\nCloud SQL database\nNeed auto-scaling', target_environment: 'gcp', deployment_type: 'initial', status: 'pending' },
    { title: 'Disaster Recovery Setup', description: 'DR environment creation', current_setup: 'Primary in US-East-1\nNo DR currently\nRPO: 1 hour, RTO: 4 hours', target_environment: 'aws', deployment_type: 'disaster-recovery', status: 'completed', deployment_strategy: 'Pilot light with automated failover' },
    { title: 'Azure Kubernetes Deploy', description: 'AKS cluster setup', current_setup: 'ASP.NET Core API\nSQL Server database\nAzure AD authentication', target_environment: 'azure', deployment_type: 'migration', status: 'pending' },
    { title: 'Heroku to AWS Migration', description: 'Cost optimization move', current_setup: 'Ruby on Rails app on Heroku\nHeroku Postgres\n$500/month currently', target_environment: 'aws', deployment_type: 'migration', status: 'completed', deployment_strategy: 'ECS Fargate with RDS PostgreSQL' },
    { title: 'Edge Function Deployment', description: 'CDN edge functions', current_setup: 'API latency issues for global users\nNeed edge caching and transforms', target_environment: 'netlify', deployment_type: 'initial', status: 'pending' },
    { title: 'Container Registry Setup', description: 'Private registry deployment', current_setup: 'Using Docker Hub free tier\nNeed private images\nScan for vulnerabilities', target_environment: 'aws', deployment_type: 'initial', status: 'completed', deployment_strategy: 'ECR with automated scanning' },
    { title: 'Staging Environment Clone', description: 'New staging from prod', current_setup: 'Production running on K8s\nNeed identical staging\nSanitized data required', target_environment: 'kubernetes', deployment_type: 'initial', status: 'pending' },
    { title: 'DigitalOcean App Platform', description: 'Simple app deployment', current_setup: 'Static React frontend\nNode.js backend\nManaged Postgres', target_environment: 'digitalocean', deployment_type: 'initial', status: 'completed', deployment_strategy: 'App Platform with automatic deploys' }
  ];

  for (const item of items) {
    await query(
      `INSERT INTO deployment_advices (title, description, current_setup, target_environment, deployment_type, status, deployment_strategy)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [item.title, item.description, item.current_setup, item.target_environment, item.deployment_type, item.status, item.deployment_strategy || null]
    );
  }
  console.log('Seeded deployment_advices');
};

const seedUsers = async () => {
  const demoPassword = await hashPassword('demo123456');
  const users = [
    { email: 'demo@example.com', name: 'Demo User', role: 'admin', email_verified: true },
    { email: 'admin@example.com', name: 'Admin User', role: 'admin', email_verified: true },
    { email: 'reviewer1@example.com', name: 'Alice Johnson', role: 'reviewer', email_verified: true },
    { email: 'reviewer2@example.com', name: 'Bob Smith', role: 'reviewer', email_verified: true },
    { email: 'reviewer3@example.com', name: 'Carol Williams', role: 'reviewer', email_verified: true },
    { email: 'reviewer4@example.com', name: 'David Brown', role: 'reviewer', email_verified: true },
    { email: 'reviewer5@example.com', name: 'Eve Davis', role: 'reviewer', email_verified: true },
    { email: 'viewer1@example.com', name: 'Frank Miller', role: 'viewer', email_verified: true },
    { email: 'viewer2@example.com', name: 'Grace Wilson', role: 'viewer', email_verified: true },
    { email: 'viewer3@example.com', name: 'Henry Moore', role: 'viewer', email_verified: true },
    { email: 'viewer4@example.com', name: 'Iris Taylor', role: 'viewer', email_verified: true },
    { email: 'viewer5@example.com', name: 'Jack Anderson', role: 'viewer', email_verified: true },
    { email: 'viewer6@example.com', name: 'Karen Thomas', role: 'viewer', email_verified: false },
    { email: 'viewer7@example.com', name: 'Leo Jackson', role: 'viewer', email_verified: false },
    { email: 'viewer8@example.com', name: 'Mia White', role: 'viewer', email_verified: true },
  ];

  for (const user of users) {
    await query(
      `INSERT INTO users (email, password_hash, name, role, email_verified)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.email, demoPassword, user.name, user.role, user.email_verified]
    );
  }
  console.log('Seeded users');
};

const seedAuditLogs = async () => {
  const actions = [
    { user_email: 'demo@example.com', action: 'login', resource_type: 'auth', details: '{"method":"password"}' },
    { user_email: 'admin@example.com', action: 'create', resource_type: 'code_reviews', resource_id: '1', details: '{"title":"User Authentication Module"}' },
    { user_email: 'reviewer1@example.com', action: 'analyze', resource_type: 'code_reviews', resource_id: '1', details: '{"severity_score":6}' },
    { user_email: 'demo@example.com', action: 'create', resource_type: 'teams', resource_id: '1', details: '{"name":"Frontend Team"}' },
    { user_email: 'admin@example.com', action: 'update', resource_type: 'teams', resource_id: '1', details: '{"added_member":"reviewer1@example.com"}' },
    { user_email: 'reviewer2@example.com', action: 'create', resource_type: 'documentation', resource_id: '1', details: '{"title":"User Service Documentation"}' },
    { user_email: 'demo@example.com', action: 'export', resource_type: 'code_reviews', details: '{"format":"csv","count":15}' },
    { user_email: 'reviewer3@example.com', action: 'create', resource_type: 'security_scans', resource_id: '1', details: '{"title":"XSS Vulnerability Check"}' },
    { user_email: 'admin@example.com', action: 'bulk_delete', resource_type: 'code_reviews', details: '{"count":3}' },
    { user_email: 'reviewer1@example.com', action: 'update', resource_type: 'review_assignments', resource_id: '1', details: '{"status":"completed"}' },
    { user_email: 'demo@example.com', action: 'create', resource_type: 'webhooks', resource_id: '1', details: '{"events":["push","pull_request"]}' },
    { user_email: 'reviewer4@example.com', action: 'analyze', resource_type: 'code_analysis', resource_id: '2', details: '{"complexity_score":4}' },
    { user_email: 'admin@example.com', action: 'change_password', resource_type: 'auth', details: '{"success":true}' },
    { user_email: 'demo@example.com', action: 'login', resource_type: 'auth', details: '{"method":"password","2fa":false}' },
    { user_email: 'reviewer5@example.com', action: 'create', resource_type: 'test_generations', resource_id: '1', details: '{"title":"User Model Tests"}' },
  ];

  for (const log of actions) {
    await query(
      `INSERT INTO audit_logs (user_email, action, resource_type, resource_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [log.user_email, log.action, log.resource_type, log.resource_id || null, log.details || null, '127.0.0.1']
    );
  }
  console.log('Seeded audit_logs');
};

const seedApiKeys = async () => {
  // Get user IDs for the first few users
  const usersResult = await query('SELECT id, email FROM users ORDER BY id LIMIT 5');
  const users = usersResult.rows;

  const keys = [
    { user: users[0], name: 'CI/CD Pipeline', expires_days: 365 },
    { user: users[0], name: 'Local Development', expires_days: 90 },
    { user: users[1], name: 'Admin API Access', expires_days: 180 },
    { user: users[2], name: 'Review Automation', expires_days: 365 },
    { user: users[3], name: 'Integration Tests', expires_days: 60 },
  ];

  for (const key of keys) {
    const keyHash = await hashPassword(generateToken(16));
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + key.expires_days);
    await query(
      `INSERT INTO api_keys (user_id, key_hash, name, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [key.user.id, keyHash, key.name, expiresAt.toISOString()]
    );
  }
  console.log('Seeded api_keys');
};

const runSeed = async () => {
  try {
    console.log('Starting database seed...');

    // Initialize database tables
    await initDatabase();

    // Clear existing data (order matters due to foreign keys)
    const tables = [
      'audit_logs', 'api_keys',
      'review_assignments', 'team_members', 'teams',
      'review_issues', 'review_metrics',
      'webhook_events', 'webhooks', 'pull_requests', 'github_integrations',
      'code_reviews', 'documentation', 'code_analysis', 'api_docs',
      'readme_projects', 'code_comments', 'security_scans',
      'performance_reports', 'test_generations', 'refactoring_suggestions',
      'bug_predictions', 'code_explanations', 'tech_debt_items',
      'architecture_reviews', 'dependency_audits', 'deployment_advices',
      'users'
    ];

    for (const table of tables) {
      try {
        await query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
      } catch (e) {
        // Table might not exist yet, that's ok
      }
    }
    console.log('Cleared existing data');

    // Seed users first (other seed functions may reference them)
    await seedUsers();

    // Seed all tables
    await seedCodeReviews();
    await seedDocumentation();
    await seedCodeAnalysis();
    await seedApiDocs();
    await seedReadmeProjects();
    await seedCodeComments();
    await seedSecurityScans();
    await seedPerformanceReports();
    await seedTestGenerations();
    await seedRefactoringSuggestions();

    // Seed new feature tables
    await seedTeams();
    await seedTeamMembers();
    await seedReviewAssignments();
    await seedReviewIssues();
    await seedReviewMetrics();

    // Seed new AI feature tables
    await seedBugPredictions();
    await seedCodeExplanations();
    await seedTechDebtItems();
    await seedArchitectureReviews();
    await seedDependencyAudits();
    await seedDeploymentAdvices();

    // Seed auth-related tables
    await seedAuditLogs();
    await seedApiKeys();

    console.log('Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

runSeed();
