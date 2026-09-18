from PIL import Image
import sys

def remove_white_bg(input_path, output_path, tolerance=50):
    img = Image.open(input_path)
    img = img.convert("RGBA")
    data = img.getdata()
    
    new_data = []
    for item in data:
        # Check if the pixel is close to white
        # item is (R, G, B, A)
        if item[0] >= 255 - tolerance and item[1] >= 255 - tolerance and item[2] >= 255 - tolerance:
            # Change white (also shades of white) to transparent
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)
            
    img.putdata(new_data)
    img.save(output_path, "PNG")

if __name__ == "__main__":
    input_file = "c:\\xampp\\htdocs\\GOVSERVE\\tmms\\apps\\web\\public\\logo.jpg"
    out1 = "c:\\xampp\\htdocs\\GOVSERVE\\tmms\\apps\\web\\public\\govserve.png"
    out2 = "c:\\xampp\\htdocs\\GOVSERVE\\tmms\\apps\\website\\public\\govserve.png"
    
    # Try multiple tolerances just in case. 60 is usually good for JPG artifacts around white text
    remove_white_bg(input_file, out1, 60)
    remove_white_bg(input_file, out2, 60)
    print("Successfully converted logo.jpg to transparent govserve.png")
