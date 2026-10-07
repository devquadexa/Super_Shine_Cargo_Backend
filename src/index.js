const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Import Clean Architecture routes
const authRoutes = require('./presentation/routes/auth');
const passwordResetRoutes = require('./presentation/routes/passwordReset');
const customerRoutes = require('./presentation/routes/customers');
const jobRoutes = require('./presentation/routes/jobs');
const jobAssignmentRoutes = require('./presentation/routes/jobAssignments');
const billingRoutes = require('./presentation/routes/billing');
const pettyCashRoutes = require('./presentation/routes/pettycash');
const cashWithdrawalRoutes = require('./presentation/routes/cashWithdrawalRoutes');
const cashSummaryRoutes = require('./presentation/routes/cashSummaryRoutes');
const payItemTemplateRoutes = require('./presentation/routes/payItemTemplateRoutes');
const expenseTypeRoutes = require('./presentation/routes/expenseTypeRoutes');
const pettyCashAssignmentRoutes = require('./presentation/routes/pettyCashAssignmentRoutes');
const pettyCashReportRoutes = require('./presentation/routes/pettyCashReportRoutes');
const officePayItemRoutes = require('./presentation/routes/officePayItems');
const accountingRoutes = require('./presentation/routes/accounting');
const locationRoutes = require('./presentation/routes/locations');
const transporterRoutes = require('./presentation/routes/transporters');
const cashBalanceSettlementRoutes = require('./presentation/routes/cashBalanceSettlements');
const oldInvoiceRoutes = require('./presentation/routes/oldInvoices');
const paymentRoutes = require('./presentation/routes/paymentRoutes');
const otherExpenseRoutes = require('./presentation/routes/otherExpense');
const invoiceReviewRoutes = require('./presentation/routes/invoiceReviewRoutes');
const notificationRoutes = require('./presentation/routes/notifications');
const testNotificationRoutes = require('./presentation/routes/testNotification');
const clerkManagerRoutes = require('./presentation/routes/clerkManagerRoutes');
const container = require('./infrastructure/di/container');
const { startOverdueChecker } = require('./infrastructure/scheduler/overdueChecker');

const compression = require('compression');
const app = express();
const PORT = process.env.PORT || 5000;

app.use(compression());
app.use(cors());
app.use(bodyParser.json());

// Test database connection on startup
const isMySQL = (process.env.DB_TYPE || 'mysql').toLowerCase() === 'mysql';

const testDbConnection = async () => {
  if (isMySQL) {
    const mysqlDb = require('./config/mysqlDatabase');
    const conn = await mysqlDb.getConnection();
    conn.release();
    return 'MySQL';
  } else {
    const { getConnection } = require('./config/database');
    await getConnection();
    return 'MSSQL';
  }
};

testDbConnection()
  .then((dbType) => {
    console.log(`✅ ${dbType} Database connected successfully`);
    console.log('🏗️  Clean Architecture initialized');
    
    // Start the overdue invoice checker
    startOverdueChecker(container);
  })
  .catch((err) => {
    console.error('❌ Failed to connect to database:', err.message || err);
    console.log('Server will continue but database operations will fail');
  });

app.use('/api/auth', authRoutes);
app.use('/api/password-reset', passwordResetRoutes(container));
app.use('/api/customers', customerRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/job-assignments', jobAssignmentRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/petty-cash', pettyCashRoutes);
app.use('/api/cash-withdrawals', cashWithdrawalRoutes);
app.use('/api/cash-summary', cashSummaryRoutes);
app.use('/api/pay-item-templates', payItemTemplateRoutes(container));
app.use('/api/expense-types', expenseTypeRoutes(container));
app.use('/api/petty-cash-assignments', pettyCashAssignmentRoutes(container));
app.use('/api/pettycash-assignment', pettyCashReportRoutes(container));
app.use('/api/office-pay-items', officePayItemRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/transporters', transporterRoutes);
app.use('/api/cash-balance-settlements', cashBalanceSettlementRoutes(container));
app.use('/api/old-invoices', oldInvoiceRoutes(container));
app.use('/api/payments', paymentRoutes);
app.use('/api/other-expenses', otherExpenseRoutes(container));
app.use('/api/invoice-reviews', invoiceReviewRoutes);
app.use('/api/notifications', notificationRoutes(container));
app.use('/api/test-notification', testNotificationRoutes(container));
app.use('/api/settings/clerk-managers', clerkManagerRoutes(container));
app.use('/api/clerk-managers', clerkManagerRoutes(container));

// API health check
app.get('/api', (req, res) => {
  res.json({ 
    message: 'Super Shine Cargo Service API',
    architecture: 'Clean Architecture',
    version: '2.0.0',
    status: 'online'
  });
});

// Root route handler
app.get('/', (req, res) => {
  const frontendBuild = path.join(__dirname, '../../frontend/build/index.html');
  if (fs.existsSync(frontendBuild)) {
    return res.sendFile(frontendBuild);
  }
  res.json({
    message: 'Super Shine Cargo Service API',
    status: 'online',
    version: '2.0.0',
    endpoints: '/api'
  });
});

// Serve static files from the React app if available (monolith setup)
const frontendBuildPath = path.join(__dirname, '../../frontend/build');
if (fs.existsSync(frontendBuildPath)) {
  app.use(express.static(frontendBuildPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
}

// 404 handler for unmatched API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found', path: req.originalUrl });
});

// Export app for Vercel serverless functions
module.exports = app;

// Only start listening when not running in serverless environment (e.g. Vercel)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📐 Architecture: Clean Architecture + SOLID`);
    console.log(`🔗 API: http://localhost:${PORT}`);
  });
}
