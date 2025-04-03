import asyncio
import json
import os
import argparse
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from dotenv import load_dotenv
# from langchain_anthropic import ChatAnthropic  # Commented out
from browser_use import Agent, Controller
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import SecretStr
from browser_use import BrowserConfig, Browser

load_dotenv()  # Load environment variables from .env file

# Define the output format with Pydantic models
class ListItem(BaseModel):
    """Model for a single item in a top 10 list"""
    rank: int
    name: str
    details: Optional[str] = None

class TopTenList(BaseModel):
    """Model for the complete list of items"""
    items: List[ListItem]
    source_url: Optional[str] = None 

# Create a controller with our output model
controller = Controller(output_model=TopTenList)

async def find_and_scrape_top_10_list(topic: str, use_local_browser: bool = False):
    """
    Find and scrape a top 10 list for a given topic
    
    Args:
        topic: The topic to find a top 10 list for (e.g., "fastest birds", "tallest buildings")
        use_local_browser: Whether to use a local browser instance
        
    Returns:
        A dictionary with topic information and list items
    """
    # Initialize Gemini model
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not set")
        
    llm = ChatGoogleGenerativeAI(model='gemini-2.0-flash-exp', api_key=SecretStr(api_key))
    
    # Set up browser if using local browser
    browser = None
    if use_local_browser:
        browser_config = BrowserConfig(
            headless=False,  # Set to True to run without UI
            disable_security=True
        )
        browser = Browser(config=browser_config)
    
    # First, have the agent search for a good source for this topic
    search_task = f"""
    Search for a credible source that has a top 10 list about "{topic}".
    
    Look for sources like:
    - Reputable websites in the relevant field
    - Lists from expert organizations
    - Well-researched articles
    
    Return the URL of the best source you find along with a brief description of why it's reliable.
    """
    
    # Create a simple controller for the search task
    search_controller = Controller()
    
    # Create the search agent
    search_agent = Agent(
        task=search_task,
        llm=llm,
        controller=search_controller,
        use_vision=True,
        browser=browser  # This will be None if not using local browser
    )
    
    # Run the search agent
    print(f"Searching for a credible source about: {topic}")
    search_history = await search_agent.run()
    
    # Check for errors
    if search_history.has_errors():
        print(f"Errors during search: {search_history.errors()}")
        return None
    
    # Extract the source URL from the search results
    source_url = None
    search_result = search_history.final_result()
    
    # Have the LLM extract the URL from the search result
    extract_url_task = f"""
    Extract the best URL for a top 10 list about "{topic}" from this search result:
    
    {search_result}
    
    Return ONLY the URL, nothing else.
    """
    
    url_extraction_agent = Agent(
        task=extract_url_task,
        llm=llm,
        controller=Controller(),
        browser=browser  # This will be None if not using local browser
    )
    
    url_history = await url_extraction_agent.run()
    if not url_history.has_errors():
        source_url = url_history.final_result().strip()
    
    if not source_url or not source_url.startswith("http"):
        print("Failed to find a valid source URL. Please check the search results.")
        return None
    
    print(f"Found source: {source_url}")
    
    # Now scrape the top 10 list from the source
    scrape_task = f"""
    Visit {source_url} and extract the top 10 items for the list about "{topic}".
    
    For each item (ranked 1-10), extract:
    1. Its rank (1-10)
    2. The name/title of the item
    3. Any additional details or statistics provided
    
    If the page doesn't explicitly show rankings, determine them based on the order presented.
    If you need to click through pagination or search the page, please do so.
    Make sure to only extract the top 10 items, even if the source lists more.
    
    Return the results in the specified format: a list of items with rank, name, and details.
    Also include the source_url: "{source_url}" in your response.
    """
    
    # Create the scraping agent with our TopTenList controller
    scrape_agent = Agent(
        task=scrape_task,
        llm=llm,
        controller=controller,
        use_vision=True,
        browser=browser  # This will be None if not using local browser
    )
    
    # Run the scraping agent
    print(f"Scraping top 10 list about {topic} from {source_url}")
    scrape_history = await scrape_agent.run()
    
    # Check for errors
    if scrape_history.has_errors():
        print(f"Errors during scraping: {scrape_history.errors()}")
        return None
    
    # Get the final result
    result = scrape_history.final_result()
    if not result:
        print(f"No result found for: {topic}")
        return None
    
    try:
        # Parse the result into our Pydantic model
        parsed_list = TopTenList.model_validate_json(result)
        
        # Convert to a dictionary with metadata
        output = {
            "topic": topic,
            "source_url": source_url,
            "items": []
        }
        
        for item in parsed_list.items:
            output["items"].append({
                "rank": item.rank,
                "name": item.name,
                "details": item.details
            })
        
        # Close browser if we created one
        if browser:
            await browser.close()
            
        return output
    except Exception as e:
        print(f"Error parsing result for {topic}: {str(e)}")
        print(f"Raw result: {result}")
        
        # Close browser if we created one
        if browser:
            await browser.close()
            
        return None

async def batch_scrape_topics(topics: List[str], output_file: str, use_local_browser: bool = False):
    """Scrape multiple topics and save results to a file"""
    results = []
    
    for i, topic in enumerate(topics):
        print(f"\n[{i+1}/{len(topics)}] Processing topic: {topic}")
        
        result = await find_and_scrape_top_10_list(
            topic=topic,
            use_local_browser=use_local_browser
        )
        
        if result:
            results.append(result)
            print(f"Successfully scraped top 10 list for: {topic}")
            
            # Save progress after each successful scrape
            with open(output_file, 'w') as f:
                json.dump(results, indent=2, ensure_ascii=False, fp=f)
            print(f"Progress saved to {output_file}")
        else:
            print(f"Failed to scrape top 10 list for: {topic}")
        
        # Add delay between requests to avoid rate limiting
        if i < len(topics) - 1:
            delay = 5
            print(f"Waiting {delay} seconds before next topic...")
            await asyncio.sleep(delay)
    
    print(f"\nComplete! Scraped {len(results)} top 10 lists out of {len(topics)} topics")
    print(f"Results saved to {output_file}")
    
    return results

async def main():
    """Main function to run the scraper"""
    parser = argparse.ArgumentParser(description="Scrape top 10 lists for given topics")
    
    # Mode selection
    mode_group = parser.add_mutually_exclusive_group(required=True)
    mode_group.add_argument("--topic", help="Single topic to scrape (e.g., 'fastest birds')")
    mode_group.add_argument("--topics-file", help="JSON file with a list of topics to scrape")
    mode_group.add_argument("--topics", nargs="+", help="List of topics to scrape")
    
    # Output options
    parser.add_argument("--output", default="top10_results.json", help="Path to output JSON file")
    
    # Browser options
    parser.add_argument("--local-browser", action="store_true", help="Use local browser instance")
    
    args = parser.parse_args()
    
    # Process based on mode
    if args.topic:
        # Single topic mode
        result = await find_and_scrape_top_10_list(
            topic=args.topic,
            use_local_browser=args.local_browser
        )
        
        if result:
            with open(args.output, 'w') as f:
                json.dump([result], indent=2, ensure_ascii=False, fp=f)
            print(f"Results saved to {args.output}")
    else:
        # Multiple topics mode
        topics = []
        
        if args.topics_file:
            # Load topics from file
            with open(args.topics_file, 'r') as f:
                file_content = json.load(f)
                
                # Handle different possible file formats
                if isinstance(file_content, list):
                    # Simple list of strings
                    if all(isinstance(item, str) for item in file_content):
                        topics = file_content
                    # List of objects with topic field
                    elif all(isinstance(item, dict) and "topic" in item for item in file_content):
                        topics = [item["topic"] for item in file_content]
                    else:
                        raise ValueError("Invalid topics file format. Expected a list of strings or objects with 'topic' field.")
                else:
                    raise ValueError("Invalid topics file format. Expected a JSON array.")
        else:
            # Use topics from command line
            topics = args.topics
        
        await batch_scrape_topics(
            topics=topics,
            output_file=args.output,
            use_local_browser=args.local_browser
        )

if __name__ == "__main__":
    asyncio.run(main())