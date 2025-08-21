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
  { id: 2, email: 'jane@example.com', password: 'password456', name: 'Jane Smith' },
  { id: 3, email: 'admin@company.com', password: 'admin123', name: 'Admin User' }
];

// Mock posts database
const posts: Post[] = [
  { id: 1, title: 'First Post', content: 'This is the first post', authorId: 1 },
  { id: 2, title: 'Second Post', content: 'This is the second post', authorId: 2 },
  { id: 3, title: 'Admin Post', content: 'Admin announcement', authorId: 3 }
];

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
    introspection: true,
    playground: true
  });

  await server.start();
  server.applyMiddleware({ app, path: '/graphql' });

  const PORT = process.env.PORT || 4000;
  
  app.listen(PORT, () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`);
  });
}

startServer().catch(error => {
  console.error('Error starting server:', error);
});