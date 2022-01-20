const mongoose = require('mongoose');
const requireLogin = require('../middlewares/requireLogin');
//initialize redis
const redis = require('redis')
const redisUrl = 'redis://127.0.0.1:6379'
const client = redis.createClient(redisUrl)
//use util (promisify) instead of callback in client.get
const util = require('util')
//
const Blog = mongoose.model('Blog');

module.exports = app => {
  app.get('/api/blogs/:id', requireLogin, async (req, res) => {
    const blog = await Blog.findOne({
      _user: req.user.id,
      _id: req.params.id
    });

    res.send(blog);
  });

  app.get('/api/blogs', requireLogin, async (req, res) => {

    client.get = util.promisify(client.get)
  //Do we have any cached data in redis related to this query?
    const cachedBlogs = await client.get(req.user.id);

    if(cachedBlogs) {
      console.log('SERVING FROM CACHE')
        return res.send(JSON.parse(cachedBlogs))
    }

      const blogs = await Blog.find({ _user: req.user.id });
      console.log('SERVING FROM MONGO_DB')
      res.send(blogs);
      client.set(req.user.id, JSON.stringify(blogs))
  // if yes, then respond to this request right away from redis cache and return

  // if no, we need to respond to request, and then update our cache to store the data

  });

  app.post('/api/blogs', requireLogin, async (req, res) => {
    const { title, content } = req.body;

    const blog = new Blog({
      title,
      content,
      _user: req.user.id
    });

    try {
      await blog.save();
      res.send(blog);
    } catch (err) {
      res.send(400, err);
    }
  });
};
