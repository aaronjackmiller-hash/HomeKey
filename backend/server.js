// Universal 404 handler for any non-API routes
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});
