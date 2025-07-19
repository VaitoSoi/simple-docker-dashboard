#!/usr/bin/env python3

import asyncio
import os
import sys
import json

# Add the current directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from lib.docker import get_resource_usage


async def main():
    try:
        print("Testing Pydantic model-based resource usage...")
        
        resource_data = await get_resource_usage()
        
        print("Resource Usage Data (Pydantic Model):")
        print("=" * 50)
        
        # Test accessing attributes directly
        print("Memory:")
        print(f"  Docker containers: {resource_data.memory.docker} GB")
        print(f"  System used: {resource_data.memory.system} GB")
        print(f"  Total system: {resource_data.memory.total} GB")
        print()
        
        print("CPU:")
        print(f"  Docker containers: {resource_data.cpu.docker}%")
        print(f"  System usage: {resource_data.cpu.system}%")
        print(f"  Total CPUs: {resource_data.cpu.total}")
        print()
        
        # Test JSON serialization
        print("JSON Serialization:")
        print(json.dumps(resource_data.model_dump(), indent=2))
        print()
        
        # Test model validation
        print("Model validation successful!")
        print(f"Type: {type(resource_data)}")
        print(f"Memory type: {type(resource_data.memory)}")
        print(f"CPU type: {type(resource_data.cpu)}")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
