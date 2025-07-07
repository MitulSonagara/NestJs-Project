import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { Post } from './entities/post.entity';

@Injectable()
export class PostsService {
  constructor(@InjectRepository(Post) private readonly postRepository: Repository<Post>) {}

  findAll(): Promise<Post[]> {
    return this.postRepository.find();
  }

  async findOne(id: number): Promise<Post> {
    const singlePost = await this.postRepository.findOneBy({ id });
    if (!singlePost) {
      throw new NotFoundException(`Post with id ${id} not found`);
    }
    return singlePost;
  }

  create(post: CreatePostDto): Promise<Post> {
    const newPost = this.postRepository.create({
      title: post.title,
      content: post.content,
      authorName: post.authorName,
    });

    return this.postRepository.save(newPost);
  }

  async update(id: number, postData: UpdatePostDto): Promise<Post> {
    const findPostToUpdate = await this.findOne(id);
    const updatedPost = this.postRepository.merge(findPostToUpdate, postData);
    return this.postRepository.save(updatedPost);
  }

  async remove(id: number): Promise<void> {
    const findPostToRemove = await this.findOne(id);
    await this.postRepository.delete(findPostToRemove);
  }
}
