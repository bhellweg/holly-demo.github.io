import { useState, useEffect } from 'react'
import './App.css'
import { Document, Paragraph, Table, TableRow, TableCell, HeadingLevel, BorderStyle, Packer, ImageRun, WidthType } from 'docx';
import { saveAs } from 'file-saver';
import hollyLogo from './assets/holly-logo.png';
import jsPDF from 'jspdf';

function ResponseSection({ title, content, isExpanded, onEdit, isDarkMode }) {
  console.log('ResponseSection render:', {
    title,
    contentLength: content?.length,
    hasTable: content?.includes('|')
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);

  // Move the style definition inside the component
  const boxStyle = {
    width: '90%',
    margin: '1rem auto',
    backgroundColor: isDarkMode ? '#333' : '#f5f5f5',
    borderRadius: '4px',
    overflow: 'hidden',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  };

  // Function to convert text table to HTML table
  const formatTableContent = (text, isDarkMode) => {
    if (!text || !text.includes('|')) return text;

    const lines = text.split('\n').filter(line => line.trim());
    
    // Find the header row
    const headerRow = lines.find(line => line.includes('|'));
    if (!headerRow) return text;

    // Parse headers
    const headers = headerRow
      .split('|')
      .map(cell => cell.trim())
      .filter(Boolean);

    // Find any data rows (after the separator row)
    const dataStartIndex = lines.findIndex(line => line.includes('---')) + 1;
    const dataRows = lines
      .slice(dataStartIndex)
      .filter(line => line.includes('|'))
      .map(line => 
        line
          .split('|')
          .map(cell => cell.trim())
          .filter(Boolean)
      );

    const tableStyles = {
      table: {
        width: '100%',
        borderCollapse: 'collapse',
        marginTop: '1rem',
        backgroundColor: isDarkMode ? '#333' : '#ffffff',
        border: `1px solid ${isDarkMode ? '#666' : '#ddd'}`
      },
      th: {
        backgroundColor: isDarkMode ? '#444' : '#f5f5f5',
        color: isDarkMode ? '#fff' : '#333',
        padding: '12px',
        borderBottom: `2px solid ${isDarkMode ? '#666' : '#ddd'}`,
        borderRight: `1px solid ${isDarkMode ? '#666' : '#ddd'}`,
        textAlign: 'left',
        fontWeight: 'bold'
      },
      td: {
        padding: '12px',
        borderBottom: `1px solid ${isDarkMode ? '#666' : '#ddd'}`,
        borderRight: `1px solid ${isDarkMode ? '#666' : '#ddd'}`,
        color: isDarkMode ? '#fff' : '#333'
      }
    };

    return (
      <table style={tableStyles.table}>
        <thead>
          <tr>
            {headers.map((header, i) => (
              <th key={i} style={tableStyles.th}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataRows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} style={tableStyles.td}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div style={{
      width: '100%',
      margin: '1rem auto',
      backgroundColor: isDarkMode ? '#333' : '#f5f5f5',
      borderRadius: '4px',
      overflow: 'hidden'
    }}>
      <div style={{
        width: '100%',
        backgroundColor: isDarkMode ? '#444' : '#e0e0e0',
        color: isDarkMode ? '#fff' : '#333',
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        padding: '1rem 0'
      }}>
        <span style={{ 
          flex: '0 0 85%',
          paddingLeft: '1.5rem'
        }}>{title}</span>
        <button
          onClick={() => setIsEditing(!isEditing)}
          style={{
            backgroundColor: isEditing ? '#ff4444' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            marginRight: '1.5rem'
          }}
        >
          {isEditing ? 'Cancel' : 'Edit'}
        </button>
      </div>
      <div style={{
        padding: '1.5rem',
        whiteSpace: 'pre-wrap',
        maxHeight: '500px',
        overflowY: 'auto',
        backgroundColor: isDarkMode ? '#222' : '#ffffff',
        color: isDarkMode ? '#fff' : '#333'
      }}>
        {isEditing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              style={{
                width: '100%',
                minHeight: '200px',
                backgroundColor: isDarkMode ? '#333' : '#ffffff',
                color: isDarkMode ? '#fff' : '#333',
                padding: '0.5rem',
                border: '1px solid ' + (isDarkMode ? '#666' : '#ddd'),
                borderRadius: '4px',
                resize: 'vertical',
                fontFamily: 'monospace'
              }}
            />
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  onEdit(editedContent);
                  setIsEditing(false);
                }}
                style={{
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '0.5rem 1rem',
                  cursor: 'pointer'
                }}
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div>
            {title.toLowerCase().includes('change documentation') 
              ? formatTableContent(content, isDarkMode)
              : content}
          </div>
        )}
      </div>
    </div>
  );
}

const exportToWord = async (response, isWordFormat) => {
  try {
    if (isWordFormat) {
      console.log('Starting export with response:', response);
      
      // Convert the logo to base64
      const logoBase64 = await fetch(hollyLogo)
        .then(res => res.blob())
        .then(blob => new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        }));

      // Function to create table from markdown-style table text
      const createTableFromText = (text) => {
        const lines = text.split('\n').filter(line => line.trim());
        const headerRow = lines.find(line => line.includes('|'));
        if (!headerRow) return null;

        const headers = headerRow
          .split('|')
          .map(cell => cell.trim())
          .filter(Boolean);

        const dataStartIndex = lines.findIndex(line => line.includes('---')) + 1;
        const dataRows = lines
          .slice(dataStartIndex)
          .filter(line => line.includes('|'))
          .map(line => 
            line
              .split('|')
              .map(cell => cell.trim())
              .filter(Boolean)
          );

        return new Table({
          rows: [
            new TableRow({
              children: headers.map(header => 
                new TableCell({
                  children: [new Paragraph({ text: header })],
                  width: {
                    size: 100 / headers.length,
                    type: WidthType.PERCENTAGE,
                  },
                })
              ),
            }),
            ...dataRows.map(row => 
              new TableRow({
                children: row.map(cell => 
                  new TableCell({
                    children: [new Paragraph({ text: cell })],
                    width: {
                      size: 100 / headers.length,
                      type: WidthType.PERCENTAGE,
                    },
                  })
                ),
              })
            ),
          ],
          width: {
            size: 100,
            type: WidthType.PERCENTAGE,
          },
        });
      };

      // Create document sections
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              children: [
                new ImageRun({
                  data: logoBase64.split(',')[1],
                  transformation: {
                    width: 150,
                    height: 50
                  }
                })
              ],
              spacing: { after: 400 }
            }),
            new Paragraph({
              text: "1. Analysis",
              heading: HeadingLevel.HEADING_1
            }),
            ...response.analysis.split('\n').map(line => 
              new Paragraph({
                text: line || ''
              })
            ),

            new Paragraph({
              text: "2. Revised Job Description",
              heading: HeadingLevel.HEADING_1
            }),
            ...response.revision.split('\n').map(line => 
              new Paragraph({
                text: line || ''
              })
            ),

            new Paragraph({
              text: "3. Change Documentation",
              heading: HeadingLevel.HEADING_1
            }),
            createTableFromText(response.documentation)
          ].filter(Boolean)
        }]
      });

      console.log('Generating document...');
      const blob = await Packer.toBlob(doc);
      console.log('Document generated, saving...');
      
      saveAs(blob, 'job-description-analysis.docx');
      console.log('Export complete!');

    } else {
      // PDF Export
      const pdf = new jsPDF();
      const margin = 20;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = margin;
      
      // Set Times New Roman as default font
      pdf.setFont('times', 'normal');
      
      // Add logo
      const logoBase64 = await fetch(hollyLogo)
        .then(res => res.blob())
        .then(blob => new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        }));

      pdf.addImage(logoBase64, 'PNG', margin, yPosition, 50, 20);
      yPosition += 30;

      // Helper function to add text with line breaks and page management
      const addText = (text, sectionTitle = '') => {
        if (!text) return yPosition;
        
        // Calculate heights
        const titleLines = sectionTitle ? pdf.splitTextToSize(sectionTitle, pageWidth - 2 * margin) : [];
        const contentLines = pdf.splitTextToSize(text, pageWidth - 2 * margin);
        
        const titleHeight = titleLines.length * 8;
        const lineHeight = 7;
        const contentHeight = contentLines.length * lineHeight;
        const sectionSpacing = 10;
        
        // Add section title if provided
        if (sectionTitle) {
          // Check if title needs a new page
          if (yPosition + titleHeight + 5 > pageHeight - margin) {
            pdf.addPage();
            yPosition = margin;
          }
          
          pdf.setFontSize(14);
          pdf.setFont('times', 'bold');
          pdf.text(sectionTitle, margin, yPosition);
          yPosition += titleHeight + 5;
        }

        // Add content with proper page breaks
        pdf.setFontSize(12);
        pdf.setFont('times', 'normal');
        
        for (let i = 0; i < contentLines.length; i++) {
          // Check if we need a new page
          if (yPosition + lineHeight > pageHeight - margin) {
            pdf.addPage();
            yPosition = margin;
          }
          
          pdf.text(contentLines[i], margin, yPosition);
          yPosition += lineHeight;
        }
        
        yPosition += sectionSpacing;
        return yPosition;
      };

      // Add Analysis and Job Description sections
      yPosition = addText(response.analysis, '1. Analysis');
      yPosition = addText(response.revision, '2. Revised Job Description');
      
      // Start Change Documentation on a new page
      pdf.addPage();
      yPosition = margin;
      
      // Add Change Documentation title
      pdf.setFontSize(14);
      pdf.setFont('times', 'bold');
      pdf.text('3. Change Documentation', margin, yPosition);
      yPosition += 20;
      
      // Handle table for Change Documentation
      if (response.documentation) {
        const lines = response.documentation.split('\n').filter(line => line.trim());
        const headerRow = lines.find(line => line.includes('|'));
        
        if (headerRow) {
          const headers = headerRow
            .split('|')
            .map(cell => cell.trim())
            .filter(Boolean);

          const dataStartIndex = lines.findIndex(line => line.includes('---')) + 1;
          const dataRows = lines
            .slice(dataStartIndex)
            .filter(line => line.includes('|'))
            .map(line => 
              line
                .split('|')
                .map(cell => cell.trim())
                .filter(Boolean)
            );

          const colWidth = (pageWidth - 2 * margin) / headers.length;
          const rowHeight = 15;
          const cellPadding = 3;

          // Draw table headers
          pdf.setFontSize(12);
          pdf.setFont('times', 'bold');
          
          headers.forEach((header, i) => {
            const x = margin + (i * colWidth);
            pdf.rect(x, yPosition - 5, colWidth, rowHeight);
            const headerLines = pdf.splitTextToSize(header, colWidth - (cellPadding * 2));
            pdf.text(headerLines, x + cellPadding, yPosition);
          });
          
          yPosition += rowHeight;
          pdf.setFont('times', 'normal');

          // Draw table rows
          dataRows.forEach(row => {
            if (yPosition > pageHeight - margin - rowHeight * 2) {
              pdf.addPage();
              yPosition = margin;
              
              // Redraw headers on new page
              pdf.setFont('times', 'bold');
              headers.forEach((header, i) => {
                const x = margin + (i * colWidth);
                pdf.rect(x, yPosition - 5, colWidth, rowHeight);
                const headerLines = pdf.splitTextToSize(header, colWidth - (cellPadding * 2));
                pdf.text(headerLines, x + cellPadding, yPosition);
              });
              yPosition += rowHeight;
              pdf.setFont('times', 'normal');
            }

            let maxLines = 1;
            const cellContents = row.map(cell => {
              const lines = pdf.splitTextToSize(cell || '', colWidth - (cellPadding * 2));
              maxLines = Math.max(maxLines, lines.length);
              return lines;
            });

            const actualRowHeight = Math.max(rowHeight, maxLines * 7 + (cellPadding * 2));

            row.forEach((_, i) => {
              const x = margin + (i * colWidth);
              pdf.rect(x, yPosition - 5, colWidth, actualRowHeight);
              pdf.text(cellContents[i], x + cellPadding, yPosition);
            });
            
            yPosition += actualRowHeight;
          });
        }
      }

      // Save the PDF
      pdf.save('job-description-analysis.pdf');
    }
  } catch (error) {
    console.error('Export error:', error);
    alert('Failed to export document: ' + error.message);
  }
};

function ResultsSection({ response, loadingStage, error, onEdit, isDarkMode, isWordFormat }) {
  if (error) {
    return (
      <div style={{
        color: '#ff4444',
        backgroundColor: 'rgba(255, 68, 68, 0.1)',
        padding: '1rem',
        borderRadius: '4px',
        margin: '2rem auto',
        width: '90%',
        textAlign: 'center'
      }}>
        {error}
      </div>
    );
  }

  return (
    <div style={{ margin: '2rem auto', width: '90%' }}>
      {response?.analysis && (
        <>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'flex-end', 
            marginBottom: '1rem' 
          }}>
            <button
              onClick={() => exportToWord(response, isWordFormat)}
              style={{
                backgroundColor: '#646cff',
                color: 'white',
                padding: '0.5rem 1rem',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Export to {isWordFormat ? 'Word' : 'PDF'}
            </button>
          </div>
          
          <ResponseSection
            title="1. Analysis"
            content={response.analysis}
            isExpanded={true}
            onEdit={(content) => onEdit('analysis', content)}
            isDarkMode={isDarkMode}
          />
        </>
      )}
      {response?.revision && (
        <ResponseSection
          title="2. Revised Job Description"
          content={response.revision}
          isExpanded={true}
          onEdit={(content) => onEdit('revision', content)}
          isDarkMode={isDarkMode}
        />
      )}
      {response?.documentation && (
        <ResponseSection
          title="3. Change Documentation"
          content={response.documentation}
          isExpanded={true}
          onEdit={(content) => onEdit('documentation', content)}
          isDarkMode={isDarkMode}
        />
      )}
      {loadingStage && (
        <div style={{
          textAlign: 'center',
          padding: '2rem',
          margin: '2rem auto',
          width: '80%',
          backgroundColor: isDarkMode ? '#333' : '#ffffff',
          color: isDarkMode ? '#ffffff' : '#333'
        }}>
          <div className="loading-spinner" style={{
            width: '40px',
            height: '40px',
            border: `4px solid ${isDarkMode ? '#ffffff' : '#333333'}`,
            borderTop: '4px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem auto'
          }}></div>
          <div>Generating {loadingStage}...</div>
        </div>
      )}
    </div>
  );
}

function LoginForm({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    try {
      console.log('Attempting login with:', email);
      const credentials = btoa(`${email}:${password}`);
      
      const response = await fetch('http://localhost:3001/api/auth-test', {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${credentials}`
        }
      });

      console.log('Auth response status:', response.status);

      if (response.ok) {
        console.log('Login successful');
        localStorage.setItem('credentials', credentials);
        onLogin();
      } else {
        console.log('Login failed');
        const data = await response.json();
        setError(data.message || 'Invalid credentials');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Connection error. Please try again.');
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#ffffff',
      color: '#333'
    }}>
      <img 
        src={hollyLogo} 
        alt="Holly Logo" 
        style={{
          width: '200px',
          marginBottom: '2rem'
        }}
      />
      <form onSubmit={handleSubmit} style={{
        backgroundColor: '#f5f5f5',
        padding: '2rem',
        borderRadius: '8px',
        width: '300px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ marginBottom: '1.5rem', textAlign: 'center', color: '#333' }}>Login</h2>
        {error && (
          <div style={{
            color: '#ff4444',
            marginBottom: '1rem',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333' }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              borderRadius: '4px',
              border: '1px solid #ddd',
              backgroundColor: '#fff'
            }}
          />
        </div>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333' }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              borderRadius: '4px',
              border: '1px solid #ddd',
              backgroundColor: '#fff'
            }}
          />
        </div>
        <button
          type="submit"
          style={{
            width: '100%',
            padding: '0.75rem',
            backgroundColor: '#646cff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Login
        </button>
      </form>
    </div>
  );
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('credentials'));
  const [comparators, setComparators] = useState([''])
  const [originalJD, setOriginalJD] = useState('')
  const [status, setStatus] = useState({ loading: false, error: null })
  const [response, setResponse] = useState(null)
  const [loadingStage, setLoadingStage] = useState(null)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [isWordFormat, setIsWordFormat] = useState(true)

  // Define styles for App component
  const boxWidth = '90%';
  const boxStyle = {
    width: boxWidth,
    margin: '1rem auto',
    backgroundColor: isDarkMode ? '#333' : '#f5f5f5',
    borderRadius: '4px',
    overflow: 'hidden',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  };

  const textareaContainerStyle = {
    padding: '1.5rem',
    backgroundColor: isDarkMode ? '#222' : '#ffffff'
  };

  const textareaStyle = {
    width: '100%',
    minHeight: '200px',
    padding: '0.5rem',
    borderRadius: '4px',
    resize: 'vertical',
    backgroundColor: isDarkMode ? '#333' : '#ffffff',
    color: isDarkMode ? '#fff' : '#333',
    border: '1px solid ' + (isDarkMode ? '#666' : '#ddd'),
  };

  // Special style for Original JD textarea
  const originalJDStyle = {
    ...textareaStyle,
    backgroundColor: isDarkMode ? '#333' : '#90EE90', // Light green in light mode
  };

  // Update localStorage when dark mode changes
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  const addComparator = () => {
    setComparators([...comparators, ''])
  }

  const deleteComparator = (index) => {
    const newComparators = comparators.filter((_, i) => i !== index)
    setComparators(newComparators)
  }

  const makeAuthenticatedRequest = async (url, options = {}) => {
    const credentials = localStorage.getItem('credentials');
    if (!credentials) {
      setIsLoggedIn(false);
      throw new Error('Not authenticated');
    }

    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': 'Basic ' + credentials
      }
    });
  };

  const handleGenerate = async () => {
    try {
      if (!originalJD.trim()) {
        throw new Error('Original JD is required');
      }

      if (comparators.every(c => !c.trim())) {
        throw new Error('At least one comparator is required');
      }

      setStatus({ loading: true, error: null });
      setLoadingStage('Analysis');
      
      // Don't reset the response state, just update it as new data comes in
      const response = await makeAuthenticatedRequest('http://localhost:3001/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          originalJD,
          comparators: comparators.filter(c => c.trim())
        })
      });

      console.log('Response status:', response.status);

      const rawText = await response.text();
      console.log('Raw response:', rawText);

      let data;
      try {
        data = JSON.parse(rawText);
      } catch (e) {
        console.error('JSON parse error:', e);
        throw new Error(`Failed to parse response: ${rawText.slice(0, 100)}...`);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      // Update response state using the previous state
      setResponse(prevResponse => ({
        ...prevResponse,
        analysis: data.analysis || prevResponse?.analysis,
        revision: data.revision || prevResponse?.revision,
        documentation: data.documentation || prevResponse?.documentation
      }));

      // Update loading stages
      if (data.analysis) setLoadingStage('Revision');
      if (data.revision) setLoadingStage('Documentation');
      if (data.documentation) setLoadingStage(null);

      setStatus({ loading: false, error: null });

    } catch (error) {
      console.error('Error:', error);
      setStatus({ 
        loading: false, 
        error: error.message || 'An unexpected error occurred'
      });
      setLoadingStage(null);
    }
  };

  const handleEdit = (section, content) => {
    setResponse(prev => ({
      ...prev,
      [section]: content
    }));
  };

  // Add this to your App component where other styles are defined
  const scrollbarStyle = isDarkMode ? `
    ::-webkit-scrollbar {
      width: 10px;
    }
    ::-webkit-scrollbar-track {
      background: #333;
      border-radius: 5px;
    }
    ::-webkit-scrollbar-thumb {
      background: #666;
      border-radius: 5px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: #888;
    }
  ` : `
    ::-webkit-scrollbar {
      width: 10px;
    }
    ::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 5px;
    }
    ::-webkit-scrollbar-thumb {
      background: #ccc;
      border-radius: 5px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: #999;
    }
  `;

  if (!isLoggedIn) {
    return <LoginForm onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <div style={{ 
      backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff', 
      padding: '2rem', 
      minHeight: '100vh', 
      color: isDarkMode ? '#ffffff' : '#333',
      width: '100%',
      maxWidth: '100%',
      margin: 0,
      boxSizing: 'border-box',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        padding: '1rem',
        backgroundColor: isDarkMode ? '#333' : '#f5f5f5',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <img 
          src={hollyLogo} 
          alt="Holly Logo" 
          style={{
            width: '150px'
          }}
        />
        <button
          onClick={() => {
            localStorage.removeItem('credentials');
            setIsLoggedIn(false);
          }}
          style={{
            backgroundColor: '#ff4444',
            color: 'white',
            padding: '0.5rem 1rem',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Logout
        </button>
      </div>

      <div style={boxStyle}>
        <div style={{
          width: '100%',
          backgroundColor: isDarkMode ? '#444' : '#e0e0e0',
          color: isDarkMode ? '#fff' : '#333',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          padding: '1rem 0'
        }}>
          <span style={{ 
            flex: '0 0 85%',
            paddingLeft: '1.5rem'
          }}>Original JD</span>
        </div>
        <div style={textareaContainerStyle}>
          <textarea
            value={originalJD}
            onChange={(e) => setOriginalJD(e.target.value)}
            style={originalJDStyle}
          />
        </div>
      </div>

      {comparators.map((text, index) => (
        <div key={index} style={boxStyle}>
          <div style={{
            width: '100%',
            backgroundColor: isDarkMode ? '#444' : '#e0e0e0',
            color: isDarkMode ? '#fff' : '#333',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            padding: '1rem 0'
          }}>
            <span style={{ 
              flex: '0 0 85%',
              paddingLeft: '1.5rem'
            }}>Comparator {index + 1}</span>
            {index > 0 && (
              <button
                onClick={() => deleteComparator(index)}
                style={{
                  backgroundColor: '#ff4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '0.5rem 1rem',
                  cursor: 'pointer',
                  marginRight: '1.5rem'
                }}
              >
                Delete
              </button>
            )}
          </div>
          <div style={textareaContainerStyle}>
            <textarea
              value={text}
              onChange={(e) => {
                const newComparators = [...comparators]
                newComparators[index] = e.target.value
                setComparators(newComparators)
              }}
              style={textareaStyle}
            />
          </div>
        </div>
      ))}

      <div style={{
        width: '90%',
        margin: '1rem auto',
        display: 'flex',
        gap: '1rem'
      }}>
        <button
          style={{
            backgroundColor: '#4CAF50',
            color: 'white',
            padding: '0.5rem 1rem',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
          onClick={addComparator}
        >
          Add Comparator {comparators.length + 1}
        </button>

        <button
          style={{
            backgroundColor: '#646cff',
            color: 'white',
            padding: '0.5rem 1rem',
            border: 'none',
            borderRadius: '4px',
            cursor: status.loading ? 'not-allowed' : 'pointer',
            opacity: status.loading ? 0.7 : 1
          }}
          disabled={status.loading}
          onClick={handleGenerate}
        >
          {status.loading ? 'Generating...' : 'Generate'}
        </button>
      </div>

      <ResultsSection
        response={response}
        loadingStage={loadingStage}
        error={status.error}
        onEdit={handleEdit}
        isDarkMode={isDarkMode}
        isWordFormat={isWordFormat}
      />

      <div style={{
        position: 'fixed',
        bottom: '2rem',
        right: '2rem',
        display: 'flex',
        gap: '1rem',
        backgroundColor: isDarkMode ? '#333' : '#f5f5f5',
        padding: '1rem',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ color: isDarkMode ? '#fff' : '#333' }}>
            PDF Format
          </label>
          <div
            onClick={() => setIsWordFormat(!isWordFormat)}
            style={{
              width: '48px',
              height: '24px',
              backgroundColor: isWordFormat ? '#ccc' : '#646cff',
              borderRadius: '12px',
              position: 'relative',
              cursor: 'pointer',
              transition: 'background-color 0.3s'
            }}
          >
            <div
              style={{
                width: '20px',
                height: '20px',
                backgroundColor: 'white',
                borderRadius: '50%',
                position: 'absolute',
                top: '2px',
                left: isWordFormat ? '2px' : '26px',
                transition: 'left 0.3s'
              }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ color: isDarkMode ? '#fff' : '#333' }}>
            Dark Mode
          </label>
          <div
            onClick={() => setIsDarkMode(!isDarkMode)}
            style={{
              width: '48px',
              height: '24px',
              backgroundColor: isDarkMode ? '#646cff' : '#ccc',
              borderRadius: '12px',
              position: 'relative',
              cursor: 'pointer',
              transition: 'background-color 0.3s'
            }}
          >
            <div
              style={{
                width: '20px',
                height: '20px',
                backgroundColor: 'white',
                borderRadius: '50%',
                position: 'absolute',
                top: '2px',
                left: isDarkMode ? '26px' : '2px',
                transition: 'left 0.3s'
              }}
            />
          </div>
        </div>
      </div>

      <style>
        {`
          body {
            margin: 0;
            padding: 0;
            background-color: ${isDarkMode ? '#1a1a1a' : '#ffffff'};
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          ${scrollbarStyle}
        `}
      </style>
    </div>
  );
}

export default App
