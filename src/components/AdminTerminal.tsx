import React, { useState, useRef, useEffect } from 'react';
import { Terminal } from 'lucide-react';
import Prism from 'prismjs';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-json';
import 'prismjs/themes/prism-tomorrow.css';
import { createBackup, writeFile } from '../lib/fileSystem';
import { scrapeWebsite } from '../lib/scraper';
import { WebSocketClient } from '../lib/websocket';
import { getSystemStats, getPerformanceMetrics, getVeniceModels } from '../lib/system';
import { ping, curl, checkConnectivity } from '../lib/network';

type CodeSnippet = {
  id: string;
  language: string;
  code: string;
  description: string;
};

type Command = {
  name: string;
  description: string;
  execute: (args: string[]) => string | Promise<string>;
};

type Props = {
  isDarkMode: boolean;
  onThemeChange: (theme: 'dark' | 'light') => void;
};

const supportedLanguages = [
  'javascript', 'typescript', 'jsx', 'tsx', 'html', 'css', 
  'python', 'sql', 'json'
];

const codeSnippets: CodeSnippet[] = [];
const wsClients: Map<string, WebSocketClient> = new Map();

const commandHelp: Record<string, { description: string; example: string; explanation: string }> = {
  help: {
    description: "The help command shows you information about available commands or detailed information about a specific command. It's like having a built-in instruction manual for your terminal.",
    example: "help curl",
    explanation: "This command will show you detailed information about the 'curl' command, including what it does, how to use it, and a practical example."
  },
  clear: {
    description: "Clear removes all previous commands and outputs from your terminal screen, giving you a fresh, clean workspace. It's like erasing a whiteboard to start over.",
    example: "clear",
    explanation: "This command will erase all previous command history and output from your terminal view, making it easier to focus on new tasks."
  },
  ping: {
    description: "Ping is like sending a small message to a website or server to see if it's awake and how quickly it responds. It's like knocking on a door to see if anyone's home.",
    example: "ping google.com",
    explanation: "This command will try to reach Google's servers and tell you how long it took to get a response. It's useful for checking if a website is accessible and how fast your connection to it is."
  },
  curl: {
    description: "Curl is like a web browser for your terminal. It can fetch web pages, download files, or interact with web services. Think of it as sending a letter and getting a response back.",
    example: "curl https://api.example.com/data method=GET",
    explanation: "This command will fetch data from the example API. You can use different methods like GET (fetch data) or POST (send data) to interact with web services."
  },
  network: {
    description: "This command checks your internet connection status and quality. It's like having a health check-up for your internet connection, showing you how strong and fast it is.",
    example: "network",
    explanation: "Running this will show you if you're connected to the internet, what type of connection you have (like 4G or WiFi), and how fast it is."
  },
  stats: {
    description: "Stats gives you a complete overview of your system's current state, including browser information, memory usage, and screen details. It's like getting a full health report for your computer.",
    example: "stats",
    explanation: "This command shows you detailed information about your system's performance, memory usage, and other important metrics that help you understand how your system is running."
  },
  perf: {
    description: "Performance metrics show you how quickly different parts of your website are loading. It's like having a stopwatch for each component of your web application.",
    example: "perf",
    explanation: "This will show you timing information for all resources loaded by your page, helping you identify if anything is loading slowly or causing performance issues."
  },
  theme: {
    description: "Theme lets you switch between light and dark mode for better visibility and comfort. It's like having a light switch for your dashboard.",
    example: "theme dark",
    explanation: "This command will switch the dashboard to dark mode. You can use 'theme light' to switch back to light mode. This helps reduce eye strain in different lighting conditions."
  },
  code: {
    description: "The code command helps you manage code snippets - creating, viewing, and running them. It's like having a notebook where you can save and run pieces of code.",
    example: "code create javascript hello console.log('Hello, World!')",
    explanation: "This creates a new JavaScript code snippet named 'hello' that prints 'Hello, World!'. You can then view it with 'code show hello' or run it with 'code run hello'."
  },
  scrape: {
    description: "Scrape helps you extract information from websites. It's like having a helper that can read web pages and pull out specific information you're interested in.",
    example: "scrape https://example.com .main-content",
    explanation: "This command will fetch the content from example.com and extract text from elements matching the CSS selector '.main-content'. It's useful for gathering information from websites."
  },
  status: {
    description: "Status shows you the current state of the system, including version information and active connections. It's like checking the dashboard of your car to see how everything is running.",
    example: "status",
    explanation: "This command displays the current system status, version information, and any active WebSocket connections. It's useful for getting a quick overview of what's happening in your system."
  },
  languages: {
    description: "Languages shows you all the programming languages supported by the code command. It's like checking which languages a translator can work with before you start.",
    example: "languages",
    explanation: "This command lists all programming languages that you can use with the 'code' command. It helps you know which languages are available for creating and running code snippets."
  },
  preview: {
    description: "Preview opens HTML code snippets in a new browser window so you can see how they look. It's like trying on clothes before you buy them.",
    example: "preview my-html-snippet",
    explanation: "If you've created an HTML snippet called 'my-html-snippet', this command will open it in a new browser window so you can see how it renders. It's great for testing HTML designs."
  },
  sudo: {
    description: "Sudo implements a code snippet into a file in your project. It's like taking a draft and making it official by putting it in the right place.",
    example: "sudo my-snippet src/components/Button.tsx",
    explanation: "This command takes the code from the snippet 'my-snippet' and saves it to the file 'src/components/Button.tsx'. It's useful for moving code from experimental snippets into your actual project."
  },
  backup: {
    description: "Backup creates a downloadable copy of your current project state. It's like taking a snapshot of your work that you can save for later.",
    example: "backup",
    explanation: "This command creates a ZIP file containing your project files and automatically downloads it to your computer. It's a good way to save your work before making major changes."
  },
  ws: {
    description: "WS (WebSocket) lets you create real-time connections to servers. It's like opening a phone line that stays connected, allowing instant two-way communication.",
    example: "ws connect chat wss://chat.example.com",
    explanation: "This command opens a WebSocket connection to chat.example.com with the name 'chat'. You can then send messages with 'ws send chat hello' and close it with 'ws close chat'."
  },
  venice: {
    description: "Venice lets you interact with Venice AI models and change the active model for the chat interface.",
    example: "venice models",
    explanation: "This command shows all available Venice AI models. You can also use 'venice set llama-3.3-70b' to change the active model in the chat interface."
  }
};

const commands: Record<string, Command> = {
  help: {
    name: 'help',
    description: 'Show available commands or get detailed help for a specific command',
    execute: (args) => {
      if (args.length === 0) {
        return Object.values(commands)
          .map(cmd => `${cmd.name}: ${cmd.description}`)
          .join('\n');
      }

      const commandName = args[0].toLowerCase();
      const helpInfo = commandHelp[commandName];
      
      if (!helpInfo) {
        return `No detailed help available for '${commandName}'. Use 'help' to see all commands.`;
      }

      return `Command: ${commandName}

Description:
${helpInfo.description}

Example:
  ${helpInfo.example}

What this does:
${helpInfo.explanation}`;
    }
  },
  clear: {
    name: 'clear',
    description: 'Clear terminal history',
    execute: () => ''
  },
  theme: {
    name: 'theme',
    description: 'Toggle dark/light theme (usage: theme <dark|light>)',
    execute: (args) => {
      if (args.length !== 1 || !['dark', 'light'].includes(args[0])) {
        return 'Usage: theme <dark|light>';
      }
      return `Theme switched to ${args[0]}`;
    }
  },
  status: {
    name: 'status',
    description: 'Show current system status',
    execute: () => {
      const connections = Array.from(wsClients.keys());
      return `System Status: Online
Version: 1.0.0
Last Update: ${new Date().toLocaleString()}
Active WebSocket Connections: ${connections.length}
${connections.length > 0 ? `Connected to: ${connections.join(', ')}` : ''}`;
    }
  },
  languages: {
    name: 'languages',
    description: 'List supported programming languages',
    execute: () => {
      return 'Supported Languages:\n' + supportedLanguages.join('\n');
    }
  },
  code: {
    name: 'code',
    description: 'Create or manage code snippets (usage: code <create|list|show|run|delete> [args])',
    execute: async (args) => {
      if (args.length === 0) {
        return 'Usage: code <create|list|show|run|delete> [args]';
      }

      const [action, ...rest] = args;

      switch (action) {
        case 'create': {
          if (rest.length < 3) {
            return 'Usage: code create <language> <id> <code...>';
          }
          const [language, id, ...codeLines] = rest;
          if (!supportedLanguages.includes(language)) {
            return `Unsupported language. Use one of: ${supportedLanguages.join(', ')}`;
          }
          const code = codeLines.join(' ');
          const snippet: CodeSnippet = {
            id,
            language,
            code,
            description: `Code snippet in ${language}`
          };
          codeSnippets.push(snippet);
          return `Created ${language} snippet '${id}'`;
        }

        case 'list':
          if (codeSnippets.length === 0) {
            return 'No code snippets found';
          }
          return codeSnippets
            .map(s => `${s.id} (${s.language}): ${s.description}`)
            .join('\n');

        case 'show': {
          if (rest.length !== 1) {
            return 'Usage: code show <id>';
          }
          const snippet = codeSnippets.find(s => s.id === rest[0]);
          if (!snippet) {
            return `Snippet '${rest[0]}' not found`;
          }
          const language = snippet.language === 'html' ? 'markup' : snippet.language;
          const highlighted = Prism.highlight(
            snippet.code,
            Prism.languages[language],
            language
          );
          return `Language: ${snippet.language}\nCode:\n${highlighted}`;
        }

        case 'run': {
          if (rest.length !== 1) {
            return 'Usage: code run <id>';
          }
          const snippet = codeSnippets.find(s => s.id === rest[0]);
          if (!snippet) {
            return `Snippet '${rest[0]}' not found`;
          }

          try {
            switch (snippet.language) {
              case 'javascript':
                const result = new Function(snippet.code)();
                return `Executed successfully. Result: ${result}`;
              
              case 'html':
                return `HTML Preview:\n${snippet.code}\n\nUse 'preview ${snippet.id}' to view in a new window`;
              
              default:
                return `Running ${snippet.language} code is not supported yet`;
            }
          } catch (error) {
            return `Error executing code: ${error}`;
          }
        }

        case 'delete': {
          if (rest.length !== 1) {
            return 'Usage: code delete <id>';
          }
          const index = codeSnippets.findIndex(s => s.id === rest[0]);
          if (index === -1) {
            return `Snippet '${rest[0]}' not found`;
          }
          codeSnippets.splice(index, 1);
          return `Deleted snippet '${rest[0]}'`;
        }

        default:
          return `Unknown action '${action}'. Use: create, list, show, run, or delete`;
      }
    }
  },
  preview: {
    name: 'preview',
    description: 'Preview HTML code snippet in a new window',
    execute: (args) => {
      if (args.length !== 1) {
        return 'Usage: preview <snippet_id>';
      }
      const snippet = codeSnippets.find(s => s.id === args[0]);
      if (!snippet) {
        return `Snippet '${args[0]}' not found`;
      }
      if (snippet.language !== 'html') {
        return 'Only HTML snippets can be previewed';
      }
      
      const previewWindow = window.open('', '_blank');
      if (previewWindow) {
        previewWindow.document.write(snippet.code);
        previewWindow.document.close();
        return 'Preview opened in new window';
      }
      return 'Failed to open preview window';
    }
  },
  sudo: {
    name: 'sudo',
    description: 'Implement code snippet into production (usage: sudo <snippet_id> <file_path>)',
    execute: async (args) => {
      if (args.length !== 2) {
        return 'Usage: sudo <snippet_id> <file_path>';
      }
      
      const [snippetId, filePath] = args;
      const snippet = codeSnippets.find(s => s.id === snippetId);
      
      if (!snippet) {
        return `Snippet '${snippetId}' not found`;
      }

      try {
        await writeFile(filePath, snippet.code);
        return `Successfully implemented '${snippetId}' into ${filePath}`;
      } catch (error) {
        return `Error implementing code: ${error}`;
      }
    }
  },
  backup: {
    name: 'backup',
    description: 'Create a backup of the current project state',
    execute: async () => {
      try {
        const filename = await createBackup();
        return `Backup created: ${filename}\nThe file will be downloaded automatically.`;
      } catch (error) {
        return `Error creating backup: ${error}`;
      }
    }
  },
  scrape: {
    name: 'scrape',
    description: 'Scrape content from a website (usage: scrape <url> [css-selector])',
    execute: async (args) => {
      if (args.length === 0) {
        return 'Usage: scrape <url> [css-selector]';
      }
      
      const [url, selector] = args;
      try {
        const content = await scrapeWebsite(url, selector);
        return `Content from ${url}:\n${content}`;
      } catch (error) {
        return `Error: ${error}`;
      }
    }
  },
  ws: {
    name: 'ws',
    description: 'WebSocket operations (usage: ws <connect|send|close> [args])',
    execute: async (args) => {
      if (args.length === 0) {
        return 'Usage: ws <connect|send|close> [args]';
      }

      const [action, ...rest] = args;

      switch (action) {
        case 'connect': {
          if (rest.length !== 2) {
            return 'Usage: ws connect <name> <url>';
          }
          const [name, url] = rest;
          
          try {
            const client = new WebSocketClient();
            await client.connect(url);
            wsClients.set(name, client);
            
            client.onMessage((data) => {
              console.log(`[${name}] Received:`, data);
            });
            
            return `Connected to ${url} as "${name}"`;
          } catch (error) {
            return `Failed to connect: ${error}`;
          }
        }

        case 'send': {
          if (rest.length !== 2) {
            return 'Usage: ws send <name> <message>';
          }
          const [name, message] = rest;
          
          const client = wsClients.get(name);
          if (!client) {
            return `No connection named "${name}"`;
          }
          
          try {
            client.send(message);
            return `Message sent to ${name}`;
          } catch (error) {
            return `Failed to send message: ${error}`;
          }
        }

        case 'close': {
          if (rest.length !== 1) {
            return 'Usage: ws close <name>';
          }
          const [name] = rest;
          
          const client = wsClients.get(name);
          if (!client) {
            return `No connection named "${name}"`;
          }
          
          client.close();
          wsClients.delete(name);
          return `Closed connection "${name}"`;
        }

        default:
          return 'Unknown WebSocket action. Use: connect, send, or close';
      }
    }
  },
  stats: {
    name: 'stats',
    description: 'Show detailed system statistics',
    execute: async () => {
      try {
        const stats = await getSystemStats();
        return `System Statistics:

Browser:
  Platform: ${stats.browser.platform}
  Language: ${stats.browser.language}
  Online: ${stats.browser.onLine}
  Cookies: ${stats.browser.cookiesEnabled}

Screen:
  Resolution: ${stats.screen.width}x${stats.screen.height}
  Color Depth: ${stats.screen.colorDepth}
  Orientation: ${stats.screen.orientation}

Memory:
${stats.memory ? `  Total: ${(stats.memory.total / 1024 / 1024).toFixed(2)} MB
  Used: ${(stats.memory.used / 1024 / 1024).toFixed(2)} MB` : '  Memory stats not available'}

Performance:
  Navigation Type: ${stats.performance.navigation.type}
  Redirects: ${stats.performance.navigation.redirectCount}

WebSocket Connections: ${wsClients.size}
Code Snippets: ${codeSnippets.length}`;
      } catch (error) {
        return `Error getting system stats: ${error}`;
      }
    }
  },

  perf: {
    name: 'perf',
    description: 'Show performance metrics for loaded resources',
    execute: async () => {
      try {
        return `Resource Timing:\nRESOURCE                                    DURATION\n${await getPerformanceMetrics()}`;
      } catch (error) {
        return `Error getting performance metrics: ${error}`;
      }
    }
  },

  network: {
    name: 'network',
    description: 'Check network connectivity status',
    execute: async () => {
      try {
        return await checkConnectivity();
      } catch (error) {
        return `Error checking network: ${error}`;
      }
    }
  },

  ping: {
    name: 'ping',
    description: 'Ping a host',
    execute: async (args) => {
      if (args.length !== 1) {
        return 'Usage: ping <host>';
      }
      try {
        return await ping(args[0]);
      } catch (error) {
        return `Error: ${error}`;
      }
    }
  },

  curl: {
    name: 'curl',
    description: 'Make HTTP requests (usage: curl <url> [method] [data])',
    execute: async (args) => {
      if (args.length < 1) {
        return 'Usage: curl <url> [method] [data]';
      }
      const [url, method = 'GET', ...dataArgs] = args;
      const data = dataArgs.length > 0 ? JSON.parse(dataArgs.join(' ')) : undefined;
      try {
        return await curl(url, method, data);
      } catch (error) {
        return `Error: ${error}`;
      }
    }
  },
  
  venice: {
    name: 'venice',
    description: 'Interact with Venice AI (usage: venice <models|set> [model_id])',
    execute: async (args) => {
      if (args.length === 0) {
        return 'Usage: venice <models|set> [model_id]';
      }

      const [action, ...rest] = args;

      switch (action) {
        case 'models': {
          try {
            const models = await getVeniceModels();
            if (!models || models.length === 0) {
              return 'No Venice AI models found or unable to fetch models.';
            }
            
            return `Available Venice AI Models:\n\n${models.map((model: any) => {
              const traits = model.model_spec?.traits?.join(', ') || 'No traits';
              return `${model.id}${traits ? ` (${traits})` : ''}`;
            }).join('\n')}`;
          } catch (error) {
            return `Error fetching Venice AI models: ${error}`;
          }
        }

        case 'set': {
          if (rest.length !== 1) {
            return 'Usage: venice set <model_id>';
          }
          
          const modelId = rest[0];
          
          try {
            const event = new CustomEvent('veniceModelChange', { 
              detail: { modelId } 
            });
            window.dispatchEvent(event);
            return `Venice AI model set to ${modelId}`;
          } catch (error) {
            return `Error setting Venice AI model: ${error}`;
          }
        }

        default:
          return 'Unknown Venice AI action. Use: models or set';
      }
    }
  }
};

export function AdminTerminal({ isDarkMode, onThemeChange }: Props) {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<Array<{ type: 'input' | 'output', content: string }>>([
    { type: 'output', content: 'Welcome to Admin Terminal. Type "help" for available commands.' }
  ]);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  };

  useEffect(scrollToBottom, [history]);

  useEffect(() => {
    Prism.highlightAll();
  }, [history]);

  const focusInput = () => {
    inputRef.current?.focus();
  };

  const handleCommand = async (cmd: string) => {
    const [commandName, ...args] = cmd.trim().toLowerCase().split(' ');
    
    setHistory(prev => [...prev, { type: 'input', content: cmd }]);

    if (!commandName) return;

    if (commandName === 'clear') {
      setHistory([]);
      return;
    }

    const command = commands[commandName];
    if (!command) {
      setHistory(prev => [...prev, { type: 'output', content: `Command not found: ${commandName}` }]);
      return;
    }

    try {
      if (commandName === 'theme') {
        const theme = args[0] as 'dark' | 'light';
        onThemeChange(theme);
      }
      
      const result = await command.execute(args);
      setHistory(prev => [...prev, { type: 'output', content: result }]);
    } catch (error) {
      setHistory(prev => [...prev, { type: 'output', content: `Error: ${error}` }]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    handleCommand(input);
    setInput('');
  };

  return (
    <div 
      className={`mt-6 rounded-lg overflow-hidden ${
        isDarkMode ? 'bg-gray-900 border border-gray-700' : 'bg-gray-100 border border-gray-200'
      }`}
      onClick={focusInput}
    >
      <div className={`flex items-center px-4 py-2 ${
        isDarkMode ? 'bg-gray-800 border-b border-gray-700' : 'bg-gray-200 border-b border-gray-300'
      }`}>
        <Terminal className={`h-4 w-4 ${isDarkMode ? 'text-purple-400' : 'text-indigo-500'}`} />
        <span className={`ml-2 text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Admin Terminal
        </span>
      </div>
      
      <div 
        ref={terminalRef}
        className="h-64 overflow-y-auto p-4 font-mono text-sm"
      >
        {history.map((entry, i) => (
          <div key={i} className="mb-2">
            {entry.type === 'input' ? (
              <div className={`flex items-center ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <span className={isDarkMode ? 'text-purple-400' : 'text-indigo-500'}>❯</span>
                <span className="ml-2">{entry.content}</span>
              </div>
            ) : (
              <div 
                className={`ml-4 whitespace-pre-wrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
                dangerouslySetInnerHTML={{ __html: entry.content }}
              />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700">
        <div className="flex items-center">
          <span className={`text-lg ${isDarkMode ? 'text-purple-400' : 'text-indigo-500'}`}>❯</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className={`flex-1 ml-2 bg-transparent border-none outline-none ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}
            placeholder="Type a command..."
            spellCheck="false"
            autoComplete="off"
          />
        </div>
      </form>
    </div>
  );
}