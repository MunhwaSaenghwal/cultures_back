import time
from pytrends.request import TrendReq
from pytrends.exceptions import TooManyRequestsError

def get_trending_keywords():
    pytrends = TrendReq(hl='ko', tz=540, timeout=(10, 25))
    attempts = 0
    max_attempts = 3

    while attempts < max_attempts:
        try:
            pytrends.build_payload(kw_list=[''])
            trending_searches_df = pytrends.trending_searches(pn='south_korea')
            trending_keywords = trending_searches_df[0].tolist()
            return trending_keywords
        except TooManyRequestsError as e:
            print(f"Too many requests error: {e}")
            print("Waiting before retrying...")
            time.sleep(60)  # Wait for 60 seconds before retrying
            attempts += 1
        except Exception as e:
            print(f"Error occurred: {e}")
            break

    print("Exceeded maximum retry attempts. Exiting script.")
    return None

if __name__ == '__main__':
    keywords = get_trending_keywords()
    if keywords:
        for keyword in keywords:
            print(keyword)

