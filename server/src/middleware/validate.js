export const validate = (schema, source = 'body') => {
  return async (req, res, next) => {
    try {
      const data = source === 'body' ? req.body : (source === 'query' ? req.query : req.params);
      const validated = await schema.parseAsync(data);
      if (source === 'body') req.body = validated;
      else if (source === 'query') req.query = validated;
      else req.params = validated;
      next();
    } catch (err) {
      if (err.errors) {
        return res.status(400).json({
          error: 'Validation failed',
          details: err.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      return res.status(400).json({ error: err.message });
    }
  };
};
