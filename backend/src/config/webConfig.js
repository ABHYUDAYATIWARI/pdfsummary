import axios from 'axios';
import * as cheerio from 'cheerio';

export const getWebpageContent= async (url) => {
    try {
        console.log(`Fetching content for: ${url}`);
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const html = response.data;
        const $ = cheerio.load(html);

        // Remove elements that don't typically contain main content
        $('script, style, nav, footer, header, aside, form').remove();

        // Get text from the body, clean up whitespace, and trim
        let textContent = $('body').text().replace(/\s\s+/g, ' ').trim();

        // Limit the content length to avoid overwhelming the model
        const maxLength = 6000;
        if (textContent.length > maxLength) {
            textContent = textContent.substring(0, maxLength) + "... (content truncated)";
        }

        console.log(`Successfully fetched and parsed content, length: ${textContent.length} characters`);
        return textContent;

    } catch (error) {
        console.error("Webpage fetch error:", error.message);
        return `Failed to fetch content from the URL. Please ensure it's a valid, accessible link. Error: ${error.message}`;
    }
}

