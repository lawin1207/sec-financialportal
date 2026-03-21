const { pool } = require('../config/database');

async function logAction({ userId, userName, actionType, recordType, recordId, recordDescription, beforeValue, afterValue, ipAddress }) {
  try {
    await pool.query(
      `INSERT INTO audit_log (user_id, user_name, action_type, record_type, record_id, record_description, before_value, after_value, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [userId, userName, actionType, recordType, recordId, recordDescription,
       beforeValue ? JSON.stringify(beforeValue) : null,
       afterValue ? JSON.stringify(afterValue) : null,
       ipAddress]
    );
  } catch (err) {
    console.error('Failed to write audit log:', err);
    // Don't throw - audit log failure shouldn't block the operation
  }
}

module.exports = { logAction };
