import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { Pool } from 'pg';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'Mutualfundadvisor',
  password: 'Naivedya2004@',
  port: 5432,
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/portfolio', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM portfolio_items');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching portfolio:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/fund-details', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        f.scheme_code as "fundId",
        f.category,
        n.nav_value as nav
      FROM amfi_funds f
      LEFT JOIN fund_nav_history n ON f.scheme_code = n.amfi_code
      WHERE n.nav_date = (
        SELECT MAX(nav_date)
        FROM fund_nav_history
        WHERE amfi_code = f.scheme_code
      )
    `);
    
    const fundDetails = result.rows.reduce((acc, row) => {
      acc[row.fundId] = {
        category: row.category,
        nav: parseFloat(row.nav)
      };
      return acc;
    }, {});
    
    res.json(fundDetails);
  } catch (err) {
    console.error('Error fetching fund details:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/portfolio', async (req, res) => {
  try {
    const { fundId, units, investedAmount, purchaseDate, notes } = req.body;
    const result = await pool.query(
      'INSERT INTO portfolio_items (fund_id, units, invested_amount, purchase_date, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [fundId, units, investedAmount, purchaseDate, notes]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error adding portfolio item:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/portfolio/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { fundId, units, investedAmount, purchaseDate, notes } = req.body;
    const result = await pool.query(
      'UPDATE portfolio_items SET fund_id = $1, units = $2, invested_amount = $3, purchase_date = $4, notes = $5 WHERE id = $6 RETURNING *',
      [fundId, units, investedAmount, purchaseDate, notes, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating portfolio item:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/portfolio/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM portfolio_items WHERE id = $1', [id]);
    res.json({ message: 'Portfolio item deleted successfully' });
  } catch (err) {
    console.error('Error deleting portfolio item:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all funds with latest NAV
app.get('/api/funds', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        f.scheme_code,
        f.scheme_name,
        f.category,
        n.nav_value,
        n.nav_date
      FROM amfi_funds f
      LEFT JOIN fund_nav_history n ON f.scheme_code = n.amfi_code
      WHERE n.nav_date = (
        SELECT MAX(nav_date)
        FROM fund_nav_history
        WHERE amfi_code = f.scheme_code
      )
      ORDER BY f.scheme_name
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching funds:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get transactions
app.get('/api/transactions', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        t.id,
        t.fund_id,
        t.transaction_type,
        t.units,
        t.amount,
        t.nav_value,
        t.transaction_date,
        t.notes,
        f.scheme_name as fund_name,
        f.category
      FROM transactions t
      LEFT JOIN amfi_funds f ON t.fund_id = f.scheme_code
      ORDER BY t.transaction_date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching transactions:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add transaction
app.post('/api/transactions', async (req, res) => {
  try {
    const { fund_id, transaction_type, units, amount, nav_value, transaction_date, notes } = req.body;
    const result = await pool.query(
      'INSERT INTO transactions (fund_id, transaction_type, units, amount, nav_value, transaction_date, notes) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [fund_id, transaction_type, units, amount, nav_value, transaction_date, notes]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error adding transaction:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user profile
app.get('/api/profile', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM user_profiles WHERE id = $1', ['1']);
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      // Return mock profile if none exists
      res.json({
        id: '1',
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+91 98765 43210',
        risk_profile: 'Moderate',
        investment_goal: 'Long-term wealth creation',
        preferred_categories: ['Equity', 'Debt', 'Hybrid'],
        notifications: {
          priceAlerts: true,
          portfolioUpdates: true,
          marketNews: false,
          dividendAlerts: true,
        },
        auto_rebalancing: true,
        tax_loss_harvesting: false,
      });
    }
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
app.put('/api/profile', async (req, res) => {
  try {
    const { name, email, phone, riskProfile, investmentGoal, notifications, autoRebalancing, taxLossHarvesting } = req.body;
    
    // Check if profile exists
    const existingProfile = await pool.query('SELECT * FROM user_profiles WHERE id = $1', ['1']);
    
    if (existingProfile.rows.length > 0) {
      const result = await pool.query(
        `UPDATE user_profiles 
         SET name = $1, email = $2, phone = $3, risk_profile = $4, investment_goal = $5, 
             notifications = $6, auto_rebalancing = $7, tax_loss_harvesting = $8
         WHERE id = $9 RETURNING *`,
        [name, email, phone, riskProfile, investmentGoal, notifications, autoRebalancing, taxLossHarvesting, '1']
      );
      res.json(result.rows[0]);
    } else {
      const result = await pool.query(
        `INSERT INTO user_profiles 
         (id, name, email, phone, risk_profile, investment_goal, notifications, auto_rebalancing, tax_loss_harvesting)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        ['1', name, email, phone, riskProfile, investmentGoal, notifications, autoRebalancing, taxLossHarvesting]
      );
      res.json(result.rows[0]);
    }
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 