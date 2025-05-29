// Enhanced Supabase configuration with complete archive system
const SUPABASE_URL = 'https://oiluavgeyngmkqozzmnz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pbHVhdmdleW5nbWtxb3p6bW56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0NjIxOTgsImV4cCI6MjA2NDAzODE5OH0.zsfYoYDgArOBjP7SziUMgRQpIHhwTb-qgtw7t54MsXQ';

class SupabaseClient {
  constructor() {
    this.baseUrl = SUPABASE_URL;
    this.headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY
    };
    this.connected = false;
    this.debugMode = true;
    this.retryAttempts = 3;
  }

  debug(message, data) {
    if (this.debugMode) {
      console.log(`[Supabase] ${message}`, data || '');
    }
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}/rest/v1/${endpoint}`;
    const config = { headers: this.headers, ...options };

    this.debug(`Making request to: ${endpoint}`, { method: config.method || 'GET' });

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const response = await fetch(url, config);
        
        if (!response.ok) {
          const errorText = await response.text();
          this.debug(`Request failed (attempt ${attempt}): ${response.status} - ${errorText}`);
          
          if (attempt === this.retryAttempts) {
            throw new Error(`HTTP ${response.status}: ${errorText}`);
          }
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        
        this.connected = true;
        this.updateConnectionStatus(true);
        
        if (response.status === 204) {
          this.debug('Request successful (no content)');
          return null;
        }
        
        const text = await response.text();
        const result = text ? JSON.parse(text) : null;
        this.debug('Request successful', result);
        return result;
      } catch (error) {
        this.debug(`Request error (attempt ${attempt}):`, error);
        
        if (attempt === this.retryAttempts) {
          this.connected = false;
          this.updateConnectionStatus(false);
          throw error;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  updateConnectionStatus(connected) {
    const event = new CustomEvent('supabaseConnectionChange', { 
      detail: { connected } 
    });
    window.dispatchEvent(event);
  }

  async testConnection() {
    this.debug('Testing database connection...');
    try {
      await this.request('comments?limit=1');
      this.debug('Connection test successful');
      return true;
    } catch (error) {
      this.debug('Connection test failed:', error);
      return false;
    }
  }

  // === COMMENT METHODS ===
  async getComments(pageId) {
    this.debug(`Fetching comments for page: ${pageId}`);
    try {
      const comments = await this.request(
        `comments?page_id=eq.${encodeURIComponent(pageId)}&order=created_at.desc`
      );
      this.debug(`Retrieved ${comments?.length || 0} comments`);
      return comments || [];
    } catch (error) {
      this.debug('Failed to fetch comments:', error);
      return [];
    }
  }

  async getAllComments() {
    this.debug('Fetching all comments');
    try {
      const comments = await this.request('comments?order=created_at.desc');
      this.debug(`Retrieved ${comments?.length || 0} total comments`);
      return comments || [];
    } catch (error) {
      this.debug('Failed to fetch all comments:', error);
      return [];
    }
  }

  async saveFeedback(feedbackData) {
    this.debug('Saving feedback:', feedbackData);
    try {
      const feedback = {
        page_id: feedbackData.page_id,
        comment_type: 'feedback',
        comment_text: feedbackData.comment_text,
        selected_text: feedbackData.selected_text || '',
        selection_type: feedbackData.selection_type || 'text',
        session_id: this.getSessionId(),
        user_agent: navigator.userAgent
      };

      const response = await fetch(`${this.baseUrl}/rest/v1/comments`, {
        method: 'POST',
        headers: {
          ...this.headers,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(feedback)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      this.debug('Feedback saved successfully:', result);
      
      // Create archive when first comment is made
      if (feedbackData.createArchive) {
        await this.createContentArchive(feedbackData.page_id, feedbackData.contentHtml);
      }
      
      const event = new CustomEvent('feedbackSaved', { 
        detail: { feedback: result[0] || result } 
      });
      window.dispatchEvent(event);
      
      return result;
    } catch (error) {
      this.debug('Failed to save feedback:', error);
      throw error;
    }
  }

  async deleteFeedback(feedbackId) {
    this.debug(`Deleting feedback: ${feedbackId}`);
    try {
      const response = await fetch(`${this.baseUrl}/rest/v1/comments?id=eq.${feedbackId}`, {
        method: 'DELETE',
        headers: this.headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      this.debug('Feedback deleted successfully');
      
      const event = new CustomEvent('feedbackDeleted', { 
        detail: { feedbackId } 
      });
      window.dispatchEvent(event);

      return true;
    } catch (error) {
      this.debug('Failed to delete feedback:', error);
      throw error;
    }
  }

  async clearAllFeedback() {
    this.debug('Clearing all feedback');
    try {
      const response = await fetch(`${this.baseUrl}/rest/v1/comments`, {
        method: 'DELETE',
        headers: this.headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      this.debug('All feedback cleared successfully');

      const event = new CustomEvent('allFeedbackCleared');
      window.dispatchEvent(event);

      return true;
    } catch (error) {
      this.debug('Failed to clear feedback:', error);
      throw error;
    }
  }

  // === ENHANCED ARCHIVE METHODS ===
  async createContentArchive(pageId, contentHtml) {
    this.debug(`Creating archive for page: ${pageId}`);
    try {
      const archiveData = {
        page_id: pageId,
        content_html: contentHtml,
        archive_version: `v${Date.now()}`,
        resolution_status: 'active',
        session_id: this.getSessionId()
      };

      const result = await this.request('archived_content', {
        method: 'POST',
        body: JSON.stringify(archiveData)
      });

      this.debug('Archive created successfully:', result);
      return result;
    } catch (error) {
      this.debug('Failed to create archive:', error);
      throw error;
    }
  }

  async getArchives(pageId) {
    this.debug(`Fetching archives for page: ${pageId}`);
    try {
      const archives = await this.request(
        `archived_content?page_id=eq.${encodeURIComponent(pageId)}&order=created_at.desc`
      );
      this.debug(`Retrieved ${archives?.length || 0} archives`);
      return archives || [];
    } catch (error) {
      this.debug('Failed to fetch archives:', error);
      return [];
    }
  }

  async getAllArchives() {
    this.debug('Fetching all archives');
    try {
      const archives = await this.request('archived_content?order=created_at.desc');
      this.debug(`Retrieved ${archives?.length || 0} total archives`);
      return archives || [];
    } catch (error) {
      this.debug('Failed to fetch all archives:', error);
      return [];
    }
  }

  async getArchiveById(archiveId) {
    this.debug(`Fetching archive by ID: ${archiveId}`);
    try {
      const archives = await this.request(`archived_content?id=eq.${archiveId}`);
      this.debug('Archive retrieved:', archives);
      return archives && archives.length > 0 ? archives[0] : null;
    } catch (error) {
      this.debug('Failed to fetch archive by ID:', error);
      return null;
    }
  }

  async deleteArchive(archiveId) {
    this.debug(`Deleting archive: ${archiveId}`);
    try {
      await this.request(`archived_content?id=eq.${archiveId}`, {
        method: 'DELETE'
      });
      this.debug('Archive deleted successfully');
      return true;
    } catch (error) {
      this.debug('Failed to delete archive:', error);
      throw error;
    }
  }

  async markReviewComplete(pageId, resolutionNotes) {
    this.debug(`Marking review complete for page: ${pageId}`);
    try {
      // Update all archives for this page to resolved status
      await this.request(`archived_content?page_id=eq.${encodeURIComponent(pageId)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          resolution_status: 'resolved',
          resolution_date: new Date().toISOString(),
          reviewer_notes: resolutionNotes
        })
      });

      this.debug('Review marked as complete');
      return true;
    } catch (error) {
      this.debug('Failed to mark review complete:', error);
      throw error;
    }
  }

  // === ENHANCED DOWNLOAD METHODS ===
  async downloadArchiveWithComments(archiveId) {
    this.debug(`Downloading archive with comments: ${archiveId}`);
    try {
      const archive = await this.getArchiveById(archiveId);
      if (!archive) throw new Error('Archive not found');

      const comments = await this.getComments(archive.page_id);
      
      const combinedContent = this.createArchiveWithCommentsHTML(archive, comments);
      
      const blob = new Blob([combinedContent], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${archive.page_id}_${archive.archive_version}_with_comments.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      this.debug('Archive with comments downloaded successfully');
      return true;
    } catch (error) {
      this.debug('Failed to download archive with comments:', error);
      throw error;
    }
  }

  async downloadCommentsOnly(pageId) {
    this.debug(`Downloading comments for page: ${pageId}`);
    try {
      const comments = await this.getComments(pageId);
      if (!comments || comments.length === 0) {
        throw new Error('No comments found for this page');
      }
      
      const commentsData = {
        page_id: pageId,
        exported_at: new Date().toISOString(),
        comment_count: comments.length,
        comments: comments.map(comment => ({
          id: comment.id,
          comment_text: comment.comment_text,
          selected_text: comment.selected_text,
          created_at: comment.created_at,
          session_id: comment.session_id
        }))
      };
      
      const blob = new Blob([JSON.stringify(commentsData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${pageId}_comments_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      this.debug('Comments downloaded successfully');
      return true;
    } catch (error) {
      this.debug('Failed to download comments:', error);
      throw error;
    }
  }

  async exportAllData() {
    this.debug('Exporting all data');
    try {
      const [archives, comments] = await Promise.all([
        this.getAllArchives(),
        this.getAllComments()
      ]);
      
      const exportData = {
        exported_at: new Date().toISOString(),
        summary: {
          total_archives: archives.length,
          total_comments: comments.length,
          unique_pages: [...new Set(archives.map(a => a.page_id))].length
        },
        archives: archives,
        comments: comments
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `complete_archive_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      this.debug('Complete data export successful');
      return true;
    } catch (error) {
      this.debug('Failed to export all data:', error);
      throw error;
    }
  }

  createArchiveWithCommentsHTML(archive, comments) {
    const title = archive.page_id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    let commentsHTML = '';
    if (comments && comments.length > 0) {
      commentsHTML = `
        <div class="comments-section">
          <h2>💬 Document Feedback (${comments.length} comments)</h2>
          ${comments.map(comment => `
            <div class="comment-item">
              <div class="comment-header">
                <strong>Comment #${comment.id}</strong>
                <span class="comment-date">${new Date(comment.created_at).toLocaleString()}</span>
              </div>
              ${comment.selected_text ? `
                <div class="selected-text">
                  <strong>Selected Text:</strong> "${comment.selected_text}"
                </div>
              ` : ''}
              <div class="comment-text">${comment.comment_text}</div>
            </div>
          `).join('')}
        </div>
      `;
    }
    
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Archive with Comments: ${title} - ${archive.archive_version}</title>
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; margin: 0; padding: 20px; background: #fff; 
          }
          .archive-header { 
            background: #f8f9fa; padding: 20px; border-radius: 8px; 
            margin-bottom: 30px; border-left: 4px solid #673ab7; 
          }
          .archive-title { font-size: 1.5em; font-weight: 600; color: #333; margin-bottom: 10px; }
          .archive-info { font-size: 0.9em; color: #666; }
          .archive-content { max-width: 800px; margin-bottom: 40px; }
          .archive-content h1, .archive-content h2, .archive-content h3 {
            color: #333; margin-top: 1.5em; margin-bottom: 0.8em;
          }
          .archive-content p { margin-bottom: 1em; }
          .archive-content ul, .archive-content ol { margin-bottom: 1em; padding-left: 2em; }
          .archive-content img { max-width: 100%; height: auto; }
          
          .comments-section { 
            border-top: 2px solid #e9ecef; padding-top: 30px; margin-top: 40px;
          }
          .comments-section h2 { 
            color: #495057; margin-bottom: 20px; 
          }
          .comment-item { 
            background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; 
            padding: 15px; margin-bottom: 15px; 
          }
          .comment-header { 
            display: flex; justify-content: space-between; align-items: center;
            margin-bottom: 10px; font-size: 0.9em; 
          }
          .comment-date { color: #6c757d; }
          .selected-text { 
            background: #e3f2fd; padding: 8px; border-radius: 4px; 
            margin-bottom: 10px; font-style: italic; border-left: 3px solid #2196f3;
          }
          .comment-text { 
            color: #495057; line-height: 1.5; 
          }
        </style>
      </head>
      <body>
        <div class="archive-header">
          <div class="archive-title">📁 ${title} (Archive with Comments)</div>
          <div class="archive-info">
            Version: ${archive.archive_version} • 
            Created: ${new Date(archive.created_at).toLocaleString()} • 
            Status: ${archive.resolution_status} • 
            Comments: ${comments.length}
          </div>
        </div>
        <div class="archive-content">
          ${archive.content_html}
        </div>
        ${commentsHTML}
      </body>
      </html>
    `;
  }

  // === UTILITY METHODS ===
  getSessionId() {
    let sessionId = localStorage.getItem('reviewSessionId');
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('reviewSessionId', sessionId);
    }
    return sessionId;
  }

  // Simple archive download (HTML only)
  downloadArchive(archive) {
    const blob = new Blob([archive.content_html], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${archive.page_id}_${archive.archive_version}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
}

// Initialize client
window.supabaseClient = new SupabaseClient();
