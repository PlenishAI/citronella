import React, { useState, useEffect } from 'react';
import { ApolloClient, InMemoryCache, ApolloProvider, gql, useMutation, useQuery } from '@apollo/client';
import { createHttpLink } from '@apollo/client/link/http';
import { setContext } from '@apollo/client/link/context';
import './App.css';

// Types
interface User {
  id: string;
  email: string;
  name: string;
}

interface Post {
  id: string;
  title: string;
  content: string;
  author: User;
}

interface LoginResponse {
  login: {
    token: string;
    user: User;
  };
}

interface PostsResponse {
  posts: Post[];
}

interface MeResponse {
  me: User | null;
}

// GraphQL client setup
const httpLink = createHttpLink({
  uri: process.env.REACT_APP_GRAPHQL_URL || 'http://localhost:4000/graphql',
});

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    }
  }
});

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache()
});

// GraphQL queries and mutations
const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        id
        email
        name
      }
    }
  }
`;

const GET_POSTS = gql`
  query GetPosts {
    posts {
      id
      title
      content
      author {
        name
        email
      }
    }
  }
`;

const GET_ME = gql`
  query GetMe {
    me {
      id
      email
      name
    }
  }
`;

interface LoginFormProps {
  onLogin: (user: User) => void;
}

function LoginForm({ onLogin }: LoginFormProps) {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');

  const [login, { loading }] = useMutation<LoginResponse>(LOGIN_MUTATION, {
    onCompleted: (data) => {
      localStorage.setItem('token', data.login.token);
      onLogin(data.login.user);
    },
    onError: (error) => {
      setError(error.message);
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    login({ variables: { email, password } });
  };

  return (
    <div className="login-container">
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Enter your email"
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Enter your password"
          />
        </div>
        {error && <div className="error">{error}</div>}
        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      
      <div className="demo-credentials">
        <h3>Demo Credentials:</h3>
        <p><strong>Email:</strong> john@example.com</p>
        <p><strong>Password:</strong> password123</p>
        <p><em>Try with different cases: John@Example.com</em></p>
      </div>
    </div>
  );
}

function PostsList() {
  const { loading, error, data } = useQuery<PostsResponse>(GET_POSTS);

  if (loading) return <div>Loading posts...</div>;
  if (error) return <div>Error loading posts: {error.message}</div>;

  return (
    <div className="posts-container">
      <h2>Posts</h2>
      {data?.posts.map(post => (
        <div key={post.id} className="post">
          <h3>{post.title}</h3>
          <p>{post.content}</p>
          <small>By: {post.author.name} ({post.author.email})</small>
        </div>
      ))}
    </div>
  );
}

interface UserProfileProps {
  user: User;
  onLogout: () => void;
}

function UserProfile({ user, onLogout }: UserProfileProps) {
  return (
    <div className="user-profile">
      <h3>Welcome, {user.name}!</h3>
      <p>Email: {user.email}</p>
      <button onClick={onLogout}>Logout</button>
    </div>
  );
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const { data: meData } = useQuery<MeResponse>(GET_ME, {
    skip: !localStorage.getItem('token'),
    onCompleted: (data) => {
      if (data.me) {
        setUser(data.me);
      }
      setLoading(false);
    },
    onError: () => {
      localStorage.removeItem('token');
      setLoading(false);
    }
  });

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      setLoading(false);
    }
  }, []);

  const handleLogin = (userData: User) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    client.resetStore();
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Debugging Interview App</h1>
        {user && <UserProfile user={user} onLogout={handleLogout} />}
      </header>
      
      <main>
        {!user ? (
          <LoginForm onLogin={handleLogin} />
        ) : (
          <PostsList />
        )}
      </main>
    </div>
  );
}

function AppWithApollo() {
  return (
    <ApolloProvider client={client}>
      <App />
    </ApolloProvider>
  );
}

export default AppWithApollo;