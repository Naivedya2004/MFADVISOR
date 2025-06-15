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

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 