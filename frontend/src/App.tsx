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

interface Comment {
  id: string;
  text: string;
  author: User;
  createdAt: string;
}

interface Post {
  id: string;
  title: string;
  content: string;
  author: User;
  comments: Comment[];
  commentCount: number;
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
      commentCount
      comments {
        id
        text
        createdAt
        author {
          name
          email
        }
      }
    }
  }
`;

const ADD_COMMENT = gql`
  mutation AddComment($postId: Int!, $text: String!) {
    addComment(postId: $postId, text: $text) {
      id
      text
      author {
        name
      }
      createdAt
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

interface CommentFormProps {
  postId: string;
  onCommentAdded: () => void;
}

function CommentForm({ postId, onCommentAdded }: CommentFormProps) {
  const [commentText, setCommentText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  const [addComment, { loading }] = useMutation(ADD_COMMENT, {
    onCompleted: () => {
      setCommentText('');
      onCommentAdded();
    },
    onError: (error) => {
      // BUG: Generic error handling, doesn't parse specific errors
      setErrorMsg('Failed to add comment');
      console.error('Comment error:', error);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    // BUG: No client-side validation for empty/whitespace comments
    // BUG: No trimming of whitespace
    addComment({ 
      variables: { 
        postId: parseInt(postId), // BUG: Type conversion without validation
        text: commentText 
      } 
    });
  };

  return (
    <form onSubmit={handleSubmit} className="comment-form">
      <input
        type="text"
        value={commentText}
        onChange={(e) => setCommentText(e.target.value)}
        placeholder="Add a comment..."
        disabled={loading}
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Adding...' : 'Add Comment'}
      </button>
      {errorMsg && <div className="error">{errorMsg}</div>}
    </form>
  );
}

function PostsList() {
  const { loading, error, data, refetch } = useQuery<PostsResponse>(GET_POSTS, {
    // BUG: Aggressive polling causes unnecessary N+1 queries
    pollInterval: 3000
  });

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
          
          <div className="comments-section">
            <h4>Comments ({post.commentCount})</h4>
            {post.comments.map(comment => (
              <div key={comment.id} className="comment">
                <strong>{comment.author.name}</strong>: {comment.text}
                <small> - {new Date(comment.createdAt).toLocaleDateString()}</small>
              </div>
            ))}
            <CommentForm postId={post.id} onCommentAdded={() => refetch()} />
          </div>
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

  useQuery<MeResponse>(GET_ME, {
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