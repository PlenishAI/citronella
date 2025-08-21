import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import { gql } from 'apollo-server-express';
import cors from 'cors';
import jwt from 'jsonwebtoken';

const app = express();
app.use(cors());

// Types
interface User {
  id: number;
  email: string;
  password: string;
  name: string;
}

interface Post {
  id: number;
  title: string;
  content: string;
  authorId: number;
}

interface Comment {
  id: number;
  text: string;
  postId: number;
  userId: number;
  createdAt: Date;
}

interface AuthPayload {
  token: string;
  user: Omit<User, 'password'>;
}

interface Context {
  user?: Omit<User, 'password'>;
}

interface JWTPayload {
  userId: number;
}

// Mock user database
const users: User[] = [
  { id: 1, email: 'john@example.com', password: 'password123', name: 'John Doe' },
  { id: 2, email: 'Jane@example.com', password: 'password456', name: 'Jane Smith' },
  { id: 3, email: 'admin@company.com', password: 'admin123', name: 'Admin User' }
];

const posts: Post[] = [
  { id: 1, title: 'Getting Started with GraphQL', content: 'GraphQL is a query language for APIs and a runtime for executing those queries.', authorId: 1 },
  { id: 2, title: 'Understanding React Hooks', content: 'Hooks allow you to use state and other React features without writing a class.', authorId: 2 },
  { id: 3, title: 'Admin Announcement: New Features', content: 'We are excited to announce several new features coming to our platform.', authorId: 3 },
  { id: 4, title: 'Performance Optimization Tips', content: 'Here are some key strategies for optimizing your application performance.', authorId: 1 },
  { id: 5, title: 'Database Best Practices', content: 'Learn about indexing, query optimization, and connection pooling.', authorId: 2 },
  { id: 6, title: 'Security Update', content: 'Important security patches have been applied to the system.', authorId: 3 },
  { id: 7, title: 'TypeScript Migration Guide', content: 'A step-by-step guide to migrating your JavaScript project to TypeScript.', authorId: 1 },
  { id: 8, title: 'Testing Strategies', content: 'Comprehensive testing ensures your application works as expected.', authorId: 2 }
];

const comments: Comment[] = [];
let commentId = 1;

const commentTexts = [
  'Great post!', 'Thanks for sharing', 'Interesting perspective', 
  'I disagree with this', 'Can you elaborate?', 'Well said!',
  'This is helpful', 'I learned something new', 'Good point',
  'Could you provide more details?', 'Awesome content!', 'Nice work',
  'I have a question about this', 'Thanks for the explanation', 'Very insightful'
];

posts.forEach(post => {
  const numComments = 15 + Math.floor(Math.random() * 6); // 15-20 comments per post
  for (let i = 0; i < numComments; i++) {
    const randomUser = users[Math.floor(Math.random() * users.length)];
    const randomText = commentTexts[Math.floor(Math.random() * commentTexts.length)];
    comments.push({
      id: commentId++,
      text: `${randomText} (Comment ${i + 1})`,
      postId: post.id,
      userId: randomUser.id,
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random date within last 30 days
    });
  }
});

const typeDefs = gql`
  type User {
    id: ID!
    email: String!
    name: String!
  }

  type Post {
    id: ID!
    title: String!
    content: String!
    author: User!
    comments: [Comment!]!
    commentCount: Int!
  }

  type Comment {
    id: ID!
    text: String!
    author: User!
    createdAt: String!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type Query {
    posts: [Post!]!
    me: User
  }

  type Mutation {
    login(email: String!, password: String!): AuthPayload
    addComment(postId: Int!, text: String!): Comment
  }
`;

const resolvers = {
  Query: {
    posts: (): Post[] => posts,
    me: (parent: any, args: any, context: Context): Omit<User, 'password'> | null => {
      if (!context.user) return null;
      return context.user;
    }
  },

  Mutation: {
    login: (parent: any, { email, password }: { email: string; password: string }): AuthPayload => {
      // BUG: Case sensitive email comparison
      // This should use toLowerCase() for both emails
      const user = users.find(u => u.email === email && u.password === password);
      
      if (!user) {
        throw new Error('Invalid email or password');
      }

      const token = jwt.sign(
        { userId: user.id } as JWTPayload, 
        'your-secret-key', 
        { expiresIn: '24h' }
      );

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        }
      };
    },
    
    addComment: (parent: any, { postId, text }: { postId: number; text: string }, context: Context): Comment => {
      
      if (!context.user) {
        // BUG: Generic error message, doesn't specify authentication is needed
        throw new Error('Error adding comment');
      }
      
      if (!text) {
        throw new Error('Comment text is required');
      }
      
      // This could cause orphaned comments
      
      const newComment: Comment = {
        id: comments.length + 1,
        text: text,
        postId: postId,
        userId: context.user.id,
        createdAt: new Date()
      };
      
      comments.push(newComment);
      
      return newComment;
    }
  },

  Post: {
    author: (post: Post): Omit<User, 'password'> | undefined => {
      const user = users.find(user => user.id === post.authorId);
      if (!user) return undefined;
      return {
        id: user.id,
        email: user.email,
        name: user.name
      };
    },
    
    comments: (post: Post): Comment[] => {
      console.log(`Fetching comments for post ${post.id}`); // This will show the N+1 problem
      // Simulate database query delay to make performance issue noticeable
      const start = Date.now();
      while (Date.now() - start < 50) {} // 50ms delay per query
      
      const postComments = comments.filter(c => c.postId === post.id);
      return postComments;
    },
    
    commentCount: (post: Post): number => {
      console.log(`Counting comments for post ${post.id}`);
      return comments.filter(c => c.postId === post.id).length;
    }
  },
  
  Comment: {
    author: (comment: Comment): Omit<User, 'password'> | undefined => {
      console.log(`Fetching author for comment ${comment.id}`);
      // Simulate database query delay
      const start = Date.now();
      while (Date.now() - start < 10) {} // 10ms delay per comment author query
      
      const user = users.find(u => u.id === comment.userId);
      if (!user) return undefined;
      return {
        id: user.id,
        email: user.email,
        name: user.name
      };
    },
    
    createdAt: (comment: Comment): string => {
      return comment.createdAt.toISOString();
    }
  }
};

// Context function to extract user from JWT
const context = ({ req }: { req: express.Request }): Context => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (token) {
    try {
      const decoded = jwt.verify(token, 'your-secret-key') as JWTPayload;
      const user = users.find(u => u.id === decoded.userId);
      if (user) {
        return { 
          user: {
            id: user.id,
            email: user.email,
            name: user.name
          }
        };
      }
    } catch (err) {
      return {};
    }
  }
  
  return {};
};

async function startServer(): Promise<void> {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context,
    introspection: true
  });

  await server.start();
  server.applyMiddleware({ app: app as any, path: '/graphql' });

  const PORT = process.env.PORT || 4000;
  
  app.listen(PORT, () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`);
  });
}

startServer().catch(error => {
  console.error('Error starting server:', error);
});