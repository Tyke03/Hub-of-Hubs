import axios from 'axios';
import * as cheerio from 'cheerio';

export async function scrapeWebsite(url: string, selector?: string): Promise<string> {
  try {
    // Use a CORS proxy if needed
    const corsProxy = 'https://api.allorigins.win/raw?url=';
    const response = await axios.get(`${corsProxy}${encodeURIComponent(url)}`);
    const $ = cheerio.load(response.data);
    
    if (selector) {
      return $(selector).text().trim();
    }
    
    return $('body').text().trim();
  } catch (error) {
    throw new Error(`Failed to scrape ${url}: ${error}`);
  }
}